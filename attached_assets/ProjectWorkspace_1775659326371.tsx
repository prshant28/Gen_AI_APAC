import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FolderOpen, Plus, Trash2, Globe, Youtube, StickyNote,
  FileText, Sparkles, BookOpen, HelpCircle, BarChart2, GitBranch,
  X, Check, Loader2, ChevronRight, Link2, Edit3, Save,
  Tag, Search, Copy, Download, RefreshCw, AlertCircle, Folder,
  Clock, TrendingUp, Zap, Brain, ChevronDown, ExternalLink
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { useWindowSize } from '../hooks/useWindowSize';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-c294fbf1`;
const HEADERS = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` };

// ── Types ─────────────────────────────────────────────────────────────────────

type ItemType = 'note' | 'url' | 'video';
type ActiveTab = 'notes' | 'urls' | 'videos';
type AIAction = 'summary' | 'quiz' | 'report' | 'mindmap';

interface Project {
  id: string; name: string; description: string; color: string;
  createdAt: string; updatedAt: string;
  noteCount: number; urlCount: number; videoCount: number;
}

interface WorkspaceItem {
  id: string; type: ItemType; title: string; content: string;
  tags: string[]; source: string; thumbnail: string; createdAt: string;
}

interface WorkspaceProject extends Project { items: WorkspaceItem[]; }

const PROJECT_COLORS = ['#00d4ff','#8b5cf6','#f472b6','#10b981','#f59e0b','#ef4444','#06b6d4','#a78bfa'];

const AI_ACTIONS: { key: AIAction; label: string; icon: any; color: string; desc: string }[] = [
  { key: 'summary',  label: 'Generate Summary',  icon: BookOpen,   color: '#00d4ff', desc: 'Synthesize all content into key insights' },
  { key: 'quiz',     label: 'Create Quiz',        icon: HelpCircle, color: '#8b5cf6', desc: 'Generate Q&A pairs from your knowledge' },
  { key: 'report',   label: 'Generate Report',    icon: BarChart2,  color: '#f472b6', desc: 'Produce a structured research report' },
  { key: 'mindmap',  label: 'Create Mind Map',    icon: GitBranch,  color: '#10b981', desc: 'Visualize topic connections as a tree' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function extractDomain(url: string) {
  try { return new URL(url.startsWith('http') ? url : 'https://' + url).hostname.replace('www.', ''); }
  catch { return url.slice(0, 30); }
}

function extractVideoId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=)([^&?/]+)/);
  return m ? m[1] : null;
}

// Simple markdown renderer for AI output
function renderMarkdown(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <h2 key={i} style={{ color: '#e2e8f0', fontSize: 17, fontWeight: 700, margin: '20px 0 8px', letterSpacing: '-0.3px' }}>{line.slice(3)}</h2>;
    if (line.startsWith('# ')) return <h1 key={i} style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 12px', letterSpacing: '-0.5px' }}>{line.slice(2)}</h1>;
    if (line.startsWith('### ')) return <h3 key={i} style={{ color: '#6b7280', fontSize: 14, fontWeight: 600, margin: '16px 0 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{line.slice(4)}</h3>;
    if (line.startsWith('---')) return <hr key={i} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', margin: '14px 0' }} />;
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.slice(2);
      return <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}><span style={{ color: '#00d4ff', flexShrink: 0, marginTop: 2 }}>•</span><span style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.6 }}>{renderInline(content)}</span></div>;
    }
    if (line.match(/^\d+\. /)) {
      const [num, ...rest] = line.split('. ');
      return <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}><span style={{ color: '#00d4ff', flexShrink: 0, fontWeight: 600, fontSize: 12, minWidth: 18 }}>{num}.</span><span style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.6 }}>{renderInline(rest.join('. '))}</span></div>;
    }
    if (line.startsWith('> ')) return <blockquote key={i} style={{ borderLeft: '3px solid #00d4ff', paddingLeft: 12, margin: '8px 0', color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>{line.slice(2)}</blockquote>;
    if (line.startsWith('```')) return null;
    if (line === '') return <div key={i} style={{ height: 6 }} />;
    return <p key={i} style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.7, margin: '3px 0' }}>{renderInline(line)}</p>;
  });
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} style={{ color: '#e2e8f0', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} style={{ background: 'rgba(0,212,255,0.08)', color: '#00d4ff', borderRadius: 3, padding: '1px 5px', fontSize: 11, fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
    const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
    if (linkMatch) return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" style={{ color: '#00d4ff', textDecoration: 'none' }}>{linkMatch[1]}</a>;
    return <span key={i}>{part}</span>;
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, sub, color = '#6b7280' }: { icon: any; title: string; sub: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 14, textAlign: 'center' }}>
      <div style={{ width: 54, height: 54, borderRadius: 16, background: `${color}12`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={24} color={color} />
      </div>
      <div>
        <div style={{ color: '#d1d5db', fontSize: 14, fontWeight: 600, marginBottom: 5 }}>{title}</div>
        <div style={{ color: '#4b5563', fontSize: 13 }}>{sub}</div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ProjectWorkspace() {
  const { isMobile, isTablet } = useWindowSize();

  // Project list
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProject, setSelectedProject] = useState<WorkspaceProject | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);

  // New project form
  const [showNewProject, setShowNewProject] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0]);
  const [savingProject, setSavingProject] = useState(false);

  // Content tabs & add-item forms
  const [activeTab, setActiveTab] = useState<ActiveTab>('notes');
  const [showAddForm, setShowAddForm] = useState(false);

  // Note form
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState('');
  const [editingNote, setEditingNote] = useState<WorkspaceItem | null>(null);

  // URL form
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [urlTags, setUrlTags] = useState('');

  // Video form
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoTags, setVideoTags] = useState('');

  // AI tools
  const [aiOutput, setAiOutput] = useState<{ action: AIAction; content: string; projectName: string } | null>(null);
  const [aiLoading, setAiLoading] = useState<AIAction | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Search
  const [search, setSearch] = useState('');

  // Project panel (mobile)
  const [showProjectList, setShowProjectList] = useState(true);

  const aiOutputRef = useRef<HTMLDivElement>(null);

  // ── API calls ───────────────────────────────────────────────────────────────

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const r = await fetch(`${API}/workspace/projects`, { headers: HEADERS });
      const d = await r.json();
      if (d.projects) setProjects(d.projects);
    } catch (e) { console.error('fetchProjects error:', e); }
    finally { setLoadingProjects(false); }
  }, []);

  const fetchProject = useCallback(async (id: string) => {
    setLoadingProject(true);
    try {
      const r = await fetch(`${API}/workspace/projects/${id}`, { headers: HEADERS });
      const d = await r.json();
      if (d.project) setSelectedProject(d.project);
    } catch (e) { console.error('fetchProject error:', e); }
    finally { setLoadingProject(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const createProject = async () => {
    if (!newName.trim()) return;
    setSavingProject(true);
    try {
      const r = await fetch(`${API}/workspace/projects`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ name: newName, description: newDesc, color: newColor }),
      });
      const d = await r.json();
      if (d.project) {
        await fetchProjects();
        setShowNewProject(false);
        setNewName(''); setNewDesc(''); setNewColor(PROJECT_COLORS[0]);
        selectProject(d.project.id);
      }
    } catch (e) { console.error('createProject error:', e); }
    finally { setSavingProject(false); }
  };

  const deleteProject = async (id: string) => {
    await fetch(`${API}/workspace/projects/${id}`, { method: 'DELETE', headers: HEADERS });
    setProjects(p => p.filter(pr => pr.id !== id));
    if (selectedProject?.id === id) setSelectedProject(null);
  };

  const selectProject = async (id: string) => {
    await fetchProject(id);
    setShowAddForm(false);
    setAiOutput(null);
    if (isMobile) setShowProjectList(false);
  };

  const addItem = async (type: ItemType) => {
    if (!selectedProject) return;
    let title = '', content = '', tags: string[] = [], source = '';

    if (type === 'note') {
      if (!noteTitle.trim()) return;
      title = noteTitle; content = noteContent;
      tags = noteTags.split(',').map(t => t.trim()).filter(Boolean);
    } else if (type === 'url') {
      if (!urlInput.trim()) return;
      const raw = urlInput.trim();
      content = raw.startsWith('http') ? raw : `https://${raw}`;
      title = urlTitle.trim() || extractDomain(content);
      tags = urlTags.split(',').map(t => t.trim()).filter(Boolean);
      source = extractDomain(content);
    } else if (type === 'video') {
      if (!videoUrl.trim()) return;
      const raw = videoUrl.trim();
      content = raw.startsWith('http') ? raw : `https://${raw}`;
      const vid = extractVideoId(content);
      title = videoTitle.trim() || `Video – ${extractDomain(content)}`;
      tags = videoTags.split(',').map(t => t.trim()).filter(Boolean);
      source = 'YouTube';
      const thumbnail = vid ? `https://img.youtube.com/vi/${vid}/mqdefault.jpg` : '';
      const r = await fetch(`${API}/workspace/projects/${selectedProject.id}/items`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ type, title, content, tags, source, thumbnail }),
      });
      const d = await r.json();
      if (d.project) { setSelectedProject(d.project); setVideoUrl(''); setVideoTitle(''); setVideoTags(''); setShowAddForm(false); return; }
    }

    const r = await fetch(`${API}/workspace/projects/${selectedProject.id}/items`, {
      method: 'POST', headers: HEADERS,
      body: JSON.stringify({ type, title, content, tags, source }),
    });
    const d = await r.json();
    if (d.project) {
      setSelectedProject(d.project);
      setNoteTitle(''); setNoteContent(''); setNoteTags('');
      setUrlInput(''); setUrlTitle(''); setUrlTags('');
      setShowAddForm(false);
    }
  };

  const saveEditedNote = async () => {
    if (!selectedProject || !editingNote) return;
    const r = await fetch(`${API}/workspace/projects/${selectedProject.id}/items/${editingNote.id}`, {
      method: 'PUT', headers: HEADERS,
      body: JSON.stringify({ title: editingNote.title, content: editingNote.content, tags: editingNote.tags }),
    });
    const d = await r.json();
    if (d.project) { setSelectedProject(d.project); setEditingNote(null); }
  };

  const deleteItem = async (itemId: string) => {
    if (!selectedProject) return;
    const r = await fetch(`${API}/workspace/projects/${selectedProject.id}/items/${itemId}`, { method: 'DELETE', headers: HEADERS });
    const d = await r.json();
    if (d.project) setSelectedProject(d.project);
  };

  const runAI = async (action: AIAction) => {
    if (!selectedProject) return;
    setAiLoading(action); setAiOutput(null);
    try {
      const r = await fetch(`${API}/workspace/ai/generate`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ projectId: selectedProject.id, action }),
      });
      const d = await r.json();
      if (d.result) {
        setAiOutput({ action, content: d.result, projectName: d.projectName });
        setTimeout(() => aiOutputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
      }
    } catch (e) { console.error('AI generate error:', e); }
    finally { setAiLoading(null); }
  };

  const copyAI = () => {
    if (!aiOutput) return;
    navigator.clipboard.writeText(aiOutput.content);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const items = selectedProject?.items || [];
  const notes = items.filter(i => i.type === 'note');
  const urls = items.filter(i => i.type === 'url');
  const videos = items.filter(i => i.type === 'video');

  const filteredNotes = notes.filter(n => !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()));
  const filteredUrls = urls.filter(u => !search || u.title.toLowerCase().includes(search.toLowerCase()));
  const filteredVideos = videos.filter(v => !search || v.title.toLowerCase().includes(search.toLowerCase()));

  const tabItems = activeTab === 'notes' ? filteredNotes : activeTab === 'urls' ? filteredUrls : filteredVideos;
  const tabCount = activeTab === 'notes' ? notes.length : activeTab === 'urls' ? urls.length : videos.length;

  const actionLabel: Record<AIAction, string> = { summary: 'Summary', quiz: 'Quiz', report: 'Report', mindmap: 'Mind Map' };
  const actionIcon: Record<AIAction, any> = { summary: BookOpen, quiz: HelpCircle, report: BarChart2, mindmap: GitBranch };
  const actionColor: Record<AIAction, string> = { summary: '#00d4ff', quiz: '#8b5cf6', report: '#f472b6', mindmap: '#10b981' };

  // ── Layout dims ─────────────────────────────────────────────────────────────

  const sideW = isMobile ? '100%' : isTablet ? 200 : 240;
  const aiW = isMobile ? '100%' : isTablet ? 220 : 280;

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: 'calc(100vh - 92px)', minHeight: 600 }}>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="fade-in-up" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: isMobile ? 22 : 26, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
              Project Workspace
            </h1>
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
              Organize captured knowledge into projects · AI-powered synthesis tools
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {selectedProject && isMobile && (
              <button className="rs-btn rs-btn-ghost" style={{ fontSize: 13, padding: '8px 14px', gap: 6 }}
                onClick={() => setShowProjectList(p => !p)}>
                <Folder size={14} /> Projects
              </button>
            )}
            <button className="rs-btn rs-btn-primary" style={{ fontSize: 13, padding: '8px 16px', gap: 6 }}
              onClick={() => setShowNewProject(true)}>
              <Plus size={14} /> New Project
            </button>
          </div>
        </div>
      </div>

      {/* ── Main 3-column layout ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0, overflow: 'hidden' }}>

        {/* ── PROJECT LIST (Left) ──────────────────────────────────────────── */}
        {(!isMobile || showProjectList) && (
          <div style={{
            width: sideW, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10,
            ...(isMobile ? { position: 'absolute', zIndex: 30, left: 0, top: 0, bottom: 0, width: 260, background: 'rgba(8,8,20,0.98)', padding: 16, borderRight: '1px solid rgba(0,212,255,0.1)', backdropFilter: 'blur(30px)' } : {}),
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexShrink: 0 }}>
              <span style={{ color: '#6b7280', fontSize: 11, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Projects</span>
              {isMobile && (
                <button onClick={() => setShowProjectList(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
                  <X size={16} />
                </button>
              )}
            </div>

            {loadingProjects ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                <Loader2 size={18} color="#6b7280" style={{ animation: 'rotate-slow 1s linear infinite' }} />
              </div>
            ) : projects.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <FolderOpen size={28} color="#374151" style={{ margin: '0 auto 8px' }} />
                <div style={{ color: '#4b5563', fontSize: 12 }}>No projects yet</div>
              </div>
            ) : (
              <div className="scroll-custom" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {projects.map(p => {
                  const active = selectedProject?.id === p.id;
                  return (
                    <div key={p.id}
                      onClick={() => selectProject(p.id)}
                      style={{
                        padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                        background: active ? `${p.color}12` : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${active ? p.color + '35' : 'rgba(255,255,255,0.06)'}`,
                        boxShadow: active ? `0 0 20px ${p.color}0e` : 'none',
                        transition: 'all 0.2s ease', position: 'relative',
                      }}
                    >
                      {active && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 3px 3px 0', background: p.color, boxShadow: `0 0 10px ${p.color}` }} />}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, boxShadow: `0 0 8px ${p.color}`, flexShrink: 0 }} />
                        <span style={{ color: active ? '#e2e8f0' : '#9ca3af', fontSize: 13, fontWeight: active ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.name}</span>
                        <button onClick={e => { e.stopPropagation(); deleteProject(p.id); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#374151', padding: 2, display: 'flex', opacity: 0.6, flexShrink: 0 }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginLeft: 19 }}>
                        {[{ icon: StickyNote, count: p.noteCount, col: '#8b5cf6' }, { icon: Globe, count: p.urlCount, col: '#00d4ff' }, { icon: Youtube, count: p.videoCount, col: '#ff4444' }].map(({ icon: Icon, count, col }, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Icon size={10} color={count > 0 ? col : '#374151'} />
                            <span style={{ color: count > 0 ? '#9ca3af' : '#374151', fontSize: 10 }}>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* New project form */}
            {showNewProject && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, flexShrink: 0 }}>
                <input className="rs-input" placeholder="Project name" value={newName} onChange={e => setNewName(e.target.value)}
                  style={{ marginBottom: 8, fontSize: 13, padding: '8px 12px' }}
                  onKeyDown={e => e.key === 'Enter' && createProject()} autoFocus />
                <input className="rs-input" placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  style={{ marginBottom: 10, fontSize: 12, padding: '7px 12px' }} />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                  {PROJECT_COLORS.map(c => (
                    <div key={c} onClick={() => setNewColor(c)}
                      style={{ width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer', boxShadow: newColor === c ? `0 0 12px ${c}` : 'none', border: newColor === c ? '2px solid #fff' : '2px solid transparent', transition: 'all 0.15s' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="rs-btn rs-btn-ghost" style={{ flex: 1, fontSize: 12, padding: '7px 10px', justifyContent: 'center' }}
                    onClick={() => { setShowNewProject(false); setNewName(''); setNewDesc(''); }}>Cancel</button>
                  <button onClick={createProject} disabled={!newName.trim() || savingProject}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: newName.trim() ? 'pointer' : 'not-allowed', background: newColor, color: '#fff', fontSize: 12, fontWeight: 600, opacity: newName.trim() ? 1 : 0.5 }}>
                    {savingProject ? <Loader2 size={12} style={{ animation: 'rotate-slow 1s linear infinite' }} /> : <Check size={12} />}
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CONTENT AREA (Middle) ─────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: 14, overflow: 'hidden' }}>
          {!selectedProject ? (
            loadingProject ? (
              <div className="rs-card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={24} color="#6b7280" style={{ animation: 'rotate-slow 1s linear infinite' }} />
              </div>
            ) : (
              <div className="rs-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FolderOpen size={32} color="#00d4ff" />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Select a project to get started</div>
                  <div style={{ color: '#4b5563', fontSize: 13 }}>Choose a project from the left panel or create a new one</div>
                </div>
                <button className="rs-btn rs-btn-primary" style={{ fontSize: 13, padding: '10px 20px', gap: 6 }} onClick={() => setShowNewProject(true)}>
                  <Plus size={14} /> Create First Project
                </button>
              </div>
            )
          ) : (
            <>
              {/* Project title bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap', rowGap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: selectedProject.color, boxShadow: `0 0 12px ${selectedProject.color}`, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ color: '#fff', fontSize: isMobile ? 15 : 17, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedProject.name}</h2>
                  {selectedProject.description && <p style={{ color: '#6b7280', fontSize: 12, margin: 0, marginTop: 2 }}>{selectedProject.description}</p>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, color: '#4b5563', fontSize: 11 }}>
                  <Clock size={11} />
                  Updated {timeAgo(selectedProject.updatedAt)}
                </div>
              </div>

              {/* Tab bar + search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap', rowGap: 8 }}>
                <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 4 }}>
                  {([['notes', StickyNote, '#8b5cf6', notes.length], ['urls', Globe, '#00d4ff', urls.length], ['videos', Youtube, '#ff4444', videos.length]] as any[]).map(([tab, Icon, col, cnt]) => {
                    const active = activeTab === tab;
                    return (
                      <button key={tab} onClick={() => { setActiveTab(tab); setShowAddForm(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', background: active ? `${col}18` : 'transparent', color: active ? col : '#6b7280', fontSize: 13, fontWeight: active ? 600 : 400, transition: 'all 0.2s', boxShadow: active ? `0 0 15px ${col}15` : 'none' }}>
                        <Icon size={13} />
                        {!isMobile && tab.charAt(0).toUpperCase() + tab.slice(1)}
                        <span style={{ background: active ? `${col}25` : 'rgba(255,255,255,0.07)', color: active ? col : '#4b5563', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 600 }}>{cnt}</span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ flex: 1, minWidth: 140, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, padding: '7px 12px' }}>
                  <Search size={13} color="#4b5563" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${activeTab}…`}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 13, minWidth: 0 }} />
                </div>

                <button onClick={() => { setShowAddForm(p => !p); setEditingNote(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)', background: showAddForm ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.04)', color: showAddForm ? '#00d4ff' : '#9ca3af', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>
                  {showAddForm ? <X size={13} /> : <Plus size={13} />}
                  {!isMobile && (showAddForm ? 'Cancel' : `Add ${activeTab === 'notes' ? 'Note' : activeTab === 'urls' ? 'URL' : 'Video'}`)}
                </button>
              </div>

              {/* Add item form */}
              {showAddForm && (
                <div className="rs-card" style={{ padding: 18, flexShrink: 0, border: '1px solid rgba(0,212,255,0.12)' }}>
                  {activeTab === 'notes' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ color: '#6b7280', fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <StickyNote size={11} color="#8b5cf6" /> New Note
                      </div>
                      <input className="rs-input" placeholder="Note title" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} style={{ fontSize: 13 }} />
                      <textarea className="rs-input scroll-custom" placeholder="Write your note here…" value={noteContent} onChange={e => setNoteContent(e.target.value)}
                        style={{ minHeight: 100, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, fontSize: 13 }} />
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '7px 12px' }}>
                          <Tag size={12} color="#6b7280" />
                          <input placeholder="Tags (comma separated)" value={noteTags} onChange={e => setNoteTags(e.target.value)}
                            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 12 }} />
                        </div>
                        <button onClick={() => addItem('note')} disabled={!noteTitle.trim()}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: 'none', background: noteTitle.trim() ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : 'rgba(255,255,255,0.06)', color: noteTitle.trim() ? '#fff' : '#4b5563', fontSize: 13, fontWeight: 600, cursor: noteTitle.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
                          <Save size={13} /> Save Note
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'urls' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ color: '#6b7280', fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Globe size={11} color="#00d4ff" /> Save URL
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '8px 12px' }}>
                        <Link2 size={14} color="#4b5563" />
                        <input placeholder="Paste URL (e.g. https://example.com/article)" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 13 }} />
                      </div>
                      <input className="rs-input" placeholder="Title (auto-filled from domain if empty)" value={urlTitle} onChange={e => setUrlTitle(e.target.value)} style={{ fontSize: 13 }} />
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '7px 12px' }}>
                          <Tag size={12} color="#6b7280" />
                          <input placeholder="Tags (comma separated)" value={urlTags} onChange={e => setUrlTags(e.target.value)}
                            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 12 }} />
                        </div>
                        <button onClick={() => addItem('url')} disabled={!urlInput.trim()}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: 'none', background: urlInput.trim() ? 'linear-gradient(135deg,#00d4ff,#0099cc)' : 'rgba(255,255,255,0.06)', color: urlInput.trim() ? '#fff' : '#4b5563', fontSize: 13, fontWeight: 600, cursor: urlInput.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
                          <Plus size={13} /> Add URL
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'videos' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ color: '#6b7280', fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Youtube size={11} color="#ff4444" /> Add Video
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '8px 12px' }}>
                        <Link2 size={14} color="#4b5563" />
                        <input placeholder="YouTube or video URL" value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
                          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 13 }} />
                      </div>
                      <input className="rs-input" placeholder="Video title (optional)" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} style={{ fontSize: 13 }} />
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '7px 12px' }}>
                          <Tag size={12} color="#6b7280" />
                          <input placeholder="Tags (comma separated)" value={videoTags} onChange={e => setVideoTags(e.target.value)}
                            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 12 }} />
                        </div>
                        <button onClick={() => addItem('video')} disabled={!videoUrl.trim()}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: 'none', background: videoUrl.trim() ? 'linear-gradient(135deg,#ff4444,#cc0000)' : 'rgba(255,255,255,0.06)', color: videoUrl.trim() ? '#fff' : '#4b5563', fontSize: 13, fontWeight: 600, cursor: videoUrl.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
                          <Plus size={13} /> Add Video
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Edit note inline */}
              {editingNote && activeTab === 'notes' && (
                <div className="rs-card" style={{ padding: 16, flexShrink: 0, border: '1px solid rgba(139,92,246,0.2)' }}>
                  <div style={{ color: '#8b5cf6', fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>Editing Note</div>
                  <input className="rs-input" value={editingNote.title} onChange={e => setEditingNote(n => n && ({ ...n, title: e.target.value }))} style={{ marginBottom: 8, fontSize: 13 }} />
                  <textarea className="rs-input scroll-custom" value={editingNote.content} onChange={e => setEditingNote(n => n && ({ ...n, content: e.target.value }))}
                    style={{ minHeight: 80, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, fontSize: 13, marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditingNote(null)} className="rs-btn rs-btn-ghost" style={{ fontSize: 12, padding: '7px 14px' }}>Cancel</button>
                    <button onClick={saveEditedNote} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <Save size={12} /> Save Changes
                    </button>
                  </div>
                </div>
              )}

              {/* Content list */}
              <div className="scroll-custom" style={{ flex: 1, overflowY: 'auto' }}>
                {loadingProject ? (
                  <div className="rs-card" style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <Loader2 size={20} color="#6b7280" style={{ animation: 'rotate-slow 1s linear infinite' }} />
                  </div>
                ) : tabItems.length === 0 ? (
                  <div className="rs-card" style={{ minHeight: 200 }}>
                    {activeTab === 'notes' && <EmptyState icon={StickyNote} title="No notes yet" sub="Add your first note to capture thoughts and ideas" color="#8b5cf6" />}
                    {activeTab === 'urls' && <EmptyState icon={Globe} title="No saved URLs" sub="Save web articles and resources to your project" color="#00d4ff" />}
                    {activeTab === 'videos' && <EmptyState icon={Youtube} title="No videos added" sub="Add YouTube or video links to your project" color="#ff4444" />}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                    {/* NOTES */}
                    {activeTab === 'notes' && filteredNotes.map(note => (
                      <div key={note.id} className="rs-card"
                        style={{ padding: 18, border: '1px solid rgba(139,92,246,0.12)', transition: 'all 0.2s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(139,92,246,0.28)'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(139,92,246,0.12)'}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <StickyNote size={14} color="#8b5cf6" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.title}</div>
                              <div style={{ color: '#4b5563', fontSize: 11, marginTop: 1 }}>{timeAgo(note.createdAt)}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button onClick={() => setEditingNote({ ...note })}
                              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, cursor: 'pointer', color: '#6b7280', padding: '5px 8px', display: 'flex', transition: 'all 0.2s' }}>
                              <Edit3 size={12} />
                            </button>
                            <button onClick={() => deleteItem(note.id)}
                              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6, cursor: 'pointer', color: '#ef4444', padding: '5px 8px', display: 'flex', transition: 'all 0.2s' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        {note.content && (
                          <p style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.65, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{note.content.slice(0, 300)}{note.content.length > 300 ? '…' : ''}</p>
                        )}
                        {note.tags.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {note.tags.map(tag => (
                              <span key={tag} style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 4, padding: '2px 7px', fontSize: 11 }}>{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* URLS */}
                    {activeTab === 'urls' && filteredUrls.map(url => (
                      <div key={url.id} className="rs-card"
                        style={{ padding: 16, border: '1px solid rgba(0,212,255,0.1)', display: 'flex', gap: 14, alignItems: 'flex-start', transition: 'all 0.2s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,212,255,0.25)'}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,212,255,0.1)'}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Globe size={16} color="#00d4ff" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url.title}</div>
                              <a href={url.content} target="_blank" rel="noopener noreferrer"
                                style={{ color: '#00d4ff', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, opacity: 0.8 }}>
                                <ExternalLink size={10} />
                                {url.content.slice(0, 55)}{url.content.length > 55 ? '…' : ''}
                              </a>
                            </div>
                            <button onClick={() => deleteItem(url.id)}
                              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6, cursor: 'pointer', color: '#ef4444', padding: '5px 8px', display: 'flex', flexShrink: 0, transition: 'all 0.2s' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap', rowGap: 4 }}>
                            <span style={{ color: '#4b5563', fontSize: 11 }}>{timeAgo(url.createdAt)}</span>
                            {url.tags.map(tag => (
                              <span key={tag} style={{ background: 'rgba(0,212,255,0.08)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 4, padding: '1px 6px', fontSize: 10 }}>{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* VIDEOS */}
                    {activeTab === 'videos' && (
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                        {filteredVideos.map(video => {
                          const vid = extractVideoId(video.content);
                          const thumb = video.thumbnail || (vid ? `https://img.youtube.com/vi/${vid}/mqdefault.jpg` : '');
                          return (
                            <div key={video.id}
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,68,68,0.1)', borderRadius: 14, overflow: 'hidden', transition: 'all 0.2s' }}
                              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,68,68,0.28)'}
                              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,68,68,0.1)'}
                            >
                              <div style={{ position: 'relative', height: 130, overflow: 'hidden', background: '#111' }}>
                                {thumb ? (
                                  <img src={thumb} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                                ) : (
                                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,68,68,0.05)' }}>
                                    <Youtube size={32} color="#ff4444" style={{ opacity: 0.3 }} />
                                  </div>
                                )}
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(5,5,15,0.95) 100%)' }} />
                                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                                  <a href={video.content} target="_blank" rel="noopener noreferrer"
                                    style={{ background: 'rgba(255,68,68,0.8)', borderRadius: 5, padding: '3px 7px', display: 'flex', alignItems: 'center', gap: 3, color: '#fff', fontSize: 10, fontWeight: 600, textDecoration: 'none' }}>
                                    <ExternalLink size={9} /> Open
                                  </a>
                                </div>
                              </div>
                              <div style={{ padding: '10px 12px 12px' }}>
                                <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, marginBottom: 3, lineHeight: 1.35 }}>{video.title}</div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#4b5563', fontSize: 11 }}>{timeAgo(video.createdAt)}</span>
                                  <button onClick={() => deleteItem(video.id)} style={{ background: 'rgba(239,68,68,0.06)', border: 'none', borderRadius: 5, cursor: 'pointer', color: '#ef4444', padding: '3px 6px', display: 'flex' }}>
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                                {video.tags.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 7 }}>
                                    {video.tags.map(tag => (
                                      <span key={tag} style={{ background: 'rgba(255,68,68,0.08)', color: '#ff4444', border: '1px solid rgba(255,68,68,0.15)', borderRadius: 3, padding: '1px 5px', fontSize: 10 }}>{tag}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── AI TOOLS PANEL (Right) ───────────────────────────────────────── */}
        {!isMobile && (
          <div style={{ width: aiW, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#00d4ff22,#8b5cf622)', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Brain size={14} color="#00d4ff" />
              </div>
              <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>AI Tools</span>
              {selectedProject && (
                <span style={{ marginLeft: 'auto', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', borderRadius: 5, padding: '2px 7px', fontSize: 10, fontWeight: 600 }}>
                  {items.length} items
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
              {AI_ACTIONS.map(({ key, label, icon: Icon, color, desc }) => {
                const isLoading = aiLoading === key;
                const isActive = aiOutput?.action === key;
                const disabled = !selectedProject || !!aiLoading;
                return (
                  <button key={key} onClick={() => runAI(key)} disabled={disabled}
                    style={{ width: '100%', padding: '13px 15px', borderRadius: 12, border: `1px solid ${isActive ? color + '40' : 'rgba(255,255,255,0.07)'}`, background: isActive ? `${color}10` : 'rgba(255,255,255,0.03)', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s', textAlign: 'left', boxShadow: isActive ? `0 0 20px ${color}0e` : 'none', opacity: disabled && !isLoading ? 0.5 : 1 }}
                    onMouseEnter={e => { if (!disabled) { (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}35`; (e.currentTarget as HTMLButtonElement).style.background = `${color}08`; } }}
                    onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'; } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: isActive || isLoading ? `0 0 14px ${color}30` : 'none', transition: 'all 0.2s' }}>
                        {isLoading ? <Loader2 size={15} color={color} style={{ animation: 'rotate-slow 1s linear infinite' }} /> : <Icon size={15} color={color} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: isActive ? color : '#d1d5db', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {label}
                          {isLoading && <span style={{ color: color, fontSize: 10 }}>Generating…</span>}
                        </div>
                        <div style={{ color: '#4b5563', fontSize: 11, marginTop: 1 }}>{desc}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Workspace stats */}
            {selectedProject && !aiOutput && (
              <div className="rs-card" style={{ padding: 14, flexShrink: 0 }}>
                <div style={{ color: '#6b7280', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>Workspace Stats</div>
                {[
                  { label: 'Notes', value: notes.length, color: '#8b5cf6', icon: StickyNote },
                  { label: 'URLs', value: urls.length, color: '#00d4ff', icon: Globe },
                  { label: 'Videos', value: videos.length, color: '#ff4444', icon: Youtube },
                  { label: 'Total Items', value: items.length, color: '#10b981', icon: TrendingUp },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Icon size={11} color={color} />
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>{label}</span>
                    </div>
                    <span style={{ color, fontSize: 13, fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* AI output panel */}
            {aiOutput && (
              <div ref={aiOutputRef} className="scroll-custom" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div className="rs-card" style={{ border: `1px solid ${actionColor[aiOutput.action]}25`, boxShadow: `0 0 30px ${actionColor[aiOutput.action]}08`, overflow: 'hidden' }}>
                  {/* Output header */}
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${actionColor[aiOutput.action]}15`, display: 'flex', alignItems: 'center', gap: 8, background: `${actionColor[aiOutput.action]}06` }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: `${actionColor[aiOutput.action]}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {(() => { const Icon = actionIcon[aiOutput.action]; return <Icon size={12} color={actionColor[aiOutput.action]} />; })()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: actionColor[aiOutput.action], fontSize: 11, fontWeight: 600 }}>
                        {actionLabel[aiOutput.action]} · {aiOutput.projectName}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={copyAI}
                        style={{ background: copySuccess ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${copySuccess ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 6, cursor: 'pointer', color: copySuccess ? '#10b981' : '#6b7280', padding: '4px 7px', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, transition: 'all 0.2s' }}>
                        {copySuccess ? <Check size={10} /> : <Copy size={10} />}
                        {copySuccess ? 'Copied' : 'Copy'}
                      </button>
                      <button onClick={() => setAiOutput(null)}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, cursor: 'pointer', color: '#6b7280', padding: '4px 7px', display: 'flex' }}>
                        <X size={10} />
                      </button>
                    </div>
                  </div>
                  {/* Output content */}
                  <div style={{ padding: '14px 16px', fontSize: 13, lineHeight: 1.7 }}>
                    {renderMarkdown(aiOutput.content)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile AI tools bar */}
      {isMobile && selectedProject && (
        <div style={{ paddingTop: 14, flexShrink: 0 }}>
          <div style={{ color: '#6b7280', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={10} color="#8b5cf6" /> AI Tools
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {AI_ACTIONS.map(({ key, label, icon: Icon, color }) => {
              const isLoading = aiLoading === key;
              return (
                <button key={key} onClick={() => runAI(key)} disabled={!!aiLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: `1px solid ${color}25`, background: `${color}0a`, color, fontSize: 12, fontWeight: 500, cursor: !!aiLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: !!aiLoading && !isLoading ? 0.5 : 1 }}>
                  {isLoading ? <Loader2 size={12} style={{ animation: 'rotate-slow 1s linear infinite' }} /> : <Icon size={12} />}
                  {label}
                </button>
              );
            })}
          </div>

          {aiOutput && (
            <div className="rs-card" style={{ marginTop: 12, padding: 16, border: `1px solid ${actionColor[aiOutput.action]}22`, maxHeight: 320, overflowY: 'auto' }} ref={aiOutputRef}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: actionColor[aiOutput.action], fontSize: 12, fontWeight: 600 }}>{actionLabel[aiOutput.action]}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={copyAI} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, cursor: 'pointer', color: '#9ca3af', padding: '3px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Copy size={10} /> Copy
                  </button>
                  <button onClick={() => setAiOutput(null)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, cursor: 'pointer', color: '#6b7280', padding: '3px 6px', display: 'flex' }}>
                    <X size={11} />
                  </button>
                </div>
              </div>
              <div className="scroll-custom" style={{ fontSize: 12 }}>{renderMarkdown(aiOutput.content)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
