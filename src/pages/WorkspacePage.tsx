import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Kanban, PlusCircle, Plus, CheckCheck, Trash2, Loader2, Sparkles, FolderTree,
  Youtube, FileText, ExternalLink, Wand2, X, FolderPlus, Save,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AgentPipeline, { AgentStep } from '../components/AgentPipeline';

interface WsTask { id: string; text: string; folder_id?: string; done: boolean; created_at?: string }
interface WsItem {
  id: string; kind: string; ref_id?: string; title: string; url?: string;
  folder_id?: string; added_at?: string;
  meta?: {
    type?: 'video' | 'article'; thumbnail?: string; youtube_id?: string;
    channel_title?: string; duration_display?: string; domain?: string; summary?: string;
  };
}
interface WsFolder { id: string; name: string; description?: string; weight?: number }
interface WsProject {
  id: string; name: string; description?: string; color: string; goal_type?: string;
  folders: WsFolder[]; items: WsItem[]; tasks: WsTask[];
  created_at?: string; updated_at?: string;
}

const WorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [projects, setProjects] = useState<WsProject[]>([]);
  const [activeId, setActiveId] = useState<string>(params.get('project') || '');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  const [activeFolder, setActiveFolder] = useState<string>('');
  const [organizing, setOrganizing] = useState(false);
  const [organizePipeline, setOrganizePipeline] = useState<AgentStep[] | null>(null);
  const [organizeResult, setOrganizeResult] = useState<{ suggested_folders: WsFolder[]; assignments: { memory_id: string; folder_id: string }[] } | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch('/workspace/projects');
      const data = await res.json();
      const list: WsProject[] = data.projects || [];
      setProjects(list);
      if (list.length && !list.find(p => p.id === activeId)) {
        setActiveId(list[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => { loadProjects(); }, []);  // eslint-disable-line

  useEffect(() => {
    if (activeId) setParams(p => { const np = new URLSearchParams(p); np.set('project', activeId); return np; }, { replace: true });
  }, [activeId, setParams]);

  const project = projects.find(p => p.id === activeId);

  const refreshProject = async (id: string) => {
    const res = await fetch(`/workspace/projects/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setProjects(prev => prev.map(p => p.id === id ? data : p));
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/workspace/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim(), description: newProjectDesc.trim(), goal_type: 'general' }),
      });
      const data = await res.json();
      if (res.ok) {
        setProjects(prev => [data, ...prev]);
        setActiveId(data.id);
        setNewProjectName(''); setNewProjectDesc(''); setShowNewProject(false);
        window.dispatchEvent(new CustomEvent('recall-toast', { detail: { msg: `Project "${data.name}" created`, type: 'success' } }));
      }
    } finally { setCreating(false); }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    const res = await fetch(`/workspace/projects/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (activeId === id) {
        const remaining = projects.filter(p => p.id !== id);
        setActiveId(remaining[0]?.id || '');
      }
    }
  };

  const addTask = async () => {
    if (!project || !newTaskText.trim()) return;
    const res = await fetch(`/workspace/projects/${project.id}/tasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newTaskText.trim(), folder_id: activeFolder || undefined }),
    });
    if (res.ok) {
      setNewTaskText('');
      await refreshProject(project.id);
    }
  };

  const toggleTask = async (taskId: string) => {
    if (!project) return;
    await fetch(`/workspace/projects/${project.id}/tasks/${taskId}/toggle`, { method: 'POST' });
    await refreshProject(project.id);
  };

  const removeItem = async (itemId: string) => {
    if (!project) return;
    await fetch(`/workspace/projects/${project.id}/items/${itemId}`, { method: 'DELETE' });
    await refreshProject(project.id);
  };

  const runAiOrganize = async () => {
    if (!project) return;
    setOrganizing(true);
    setOrganizeResult(null);
    setOrganizePipeline([
      { name: 'Loader', label: 'Loader', status: 'running', out: 'Pulling memories…' },
      { name: 'OrganizerAgent', label: 'Organizer', status: 'queued', out: 'Will suggest folders' },
    ]);
    const t = setTimeout(() => setOrganizePipeline(prev => prev ? [{ ...prev[0], status: 'done' }, { ...prev[1], status: 'running' }] : null), 700);
    try {
      const res = await fetch(`/workspace/projects/${project.id}/ai-organize`, { method: 'POST' });
      const data = await res.json();
      clearTimeout(t);
      if (res.ok) {
        setOrganizeResult(data);
        setOrganizePipeline(prev => prev ? [{ ...prev[0], status: 'done' }, { ...prev[1], status: 'done', out: `${data.suggested_folders?.length || 0} folders, ${data.assignments?.length || 0} assignments` }] : null);
      } else {
        setOrganizePipeline(prev => prev ? prev.map(s => ({ ...s, status: 'error' as const })) : null);
      }
    } finally {
      setOrganizing(false);
    }
  };

  const applyOrganizedFolders = async () => {
    if (!project || !organizeResult) return;
    const merged = [...(project.folders || [])];
    const existing = new Set(merged.map(f => f.id));
    organizeResult.suggested_folders.forEach(f => {
      if (!existing.has(f.id)) merged.push(f);
    });
    const res = await fetch(`/workspace/projects/${project.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folders: merged }),
    });
    if (res.ok) {
      await refreshProject(project.id);
      setOrganizeResult(null);
      setOrganizePipeline(null);
      window.dispatchEvent(new CustomEvent('recall-toast', { detail: { msg: `${organizeResult.suggested_folders.length} folders added`, type: 'success' } }));
    }
  };

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 };

  const itemsForFolder = (folderId: string): WsItem[] =>
    (project?.items || []).filter(it => (folderId === '' ? !it.folder_id : it.folder_id === folderId));

  const tasksForFolder = (folderId: string): WsTask[] =>
    (project?.tasks || []).filter(t => (folderId === '' ? !t.folder_id : t.folder_id === folderId));

  const visibleItems = activeFolder ? itemsForFolder(activeFolder) : (project?.items || []);
  const visibleTasks = activeFolder ? tasksForFolder(activeFolder) : (project?.tasks || []);

  return (
    <div style={{ color: 'var(--text-1)', padding: '14px 0' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="page-header" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(245,158,11,0.35)' }}>
            <Kanban size={19} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>Workspace</h1>
            <p style={{ color: 'var(--text-3)', fontSize: 12, margin: '2px 0 0' }}>Agent-powered projects — folders, live resources, tasks. All persisted on backend.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/plan')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Sparkles size={13} /> Plan Generator
          </button>
        </div>
      </motion.div>

      {loading ? (
        <div style={{ ...card, padding: '40px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginBottom: 8 }} />
          <div style={{ fontSize: 12 }}>Loading projects…</div>
        </div>
      ) : projects.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ ...card, borderStyle: 'dashed', padding: '50px 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <FolderPlus size={26} color="#f59e0b" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>No projects yet</h3>
          <p style={{ color: 'var(--text-3)', fontSize: 12.5, margin: '0 0 14px', maxWidth: 420, marginInline: 'auto' }}>
            Run the Plan Generator and click "Save to Workspace", or create a blank project here.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={() => navigate('/plan')} style={{ padding: '9px 16px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={13} /> Open Plan Generator
            </button>
            <button onClick={() => setShowNewProject(true)} style={{ padding: '9px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-1)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              <PlusCircle size={13} /> New blank project
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="workspace-layout">
          {/* Left: project list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map((p, i) => {
              const taskCount = p.tasks?.length || 0;
              const doneCount = p.tasks?.filter(t => t.done).length || 0;
              const itemCount = p.items?.length || 0;
              const isActive = activeId === p.id;
              return (
                <motion.button key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => { setActiveId(p.id); setActiveFolder(''); }}
                  style={{ ...card, padding: '12px 14px', cursor: 'pointer', border: `1px solid ${isActive ? p.color + '40' : 'var(--border)'}`, background: isActive ? `${p.color}10` : 'var(--surface)', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.2s', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, boxShadow: isActive ? `0 0 8px ${p.color}` : 'none', flexShrink: 0 }} />
                    <span style={{ color: isActive ? 'var(--text-1)' : 'var(--text-2)', fontSize: 13, fontWeight: isActive ? 700 : 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginLeft: 16, fontSize: 10, color: 'var(--text-3)' }}>
                    <span>{itemCount} items</span>
                    <span>·</span>
                    <span>{taskCount} tasks</span>
                    {taskCount > 0 && <><span>·</span><span>{doneCount}/{taskCount} done</span></>}
                  </div>
                </motion.button>
              );
            })}
            {showNewProject ? (
              <div style={{ ...card, padding: '12px 14px' }}>
                <input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                  placeholder="Project name…"
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-1)', fontSize: 12, padding: '6px 10px', outline: 'none', fontFamily: 'inherit', marginBottom: 6 }} />
                <input value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)}
                  placeholder="Short description (optional)"
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-1)', fontSize: 11.5, padding: '6px 10px', outline: 'none', fontFamily: 'inherit', marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={createProject} disabled={creating || !newProjectName.trim()}
                    style={{ flex: 1, padding: '6px 0', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 7, color: '#f59e0b', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {creating ? 'Creating…' : 'Add'}
                  </button>
                  <button onClick={() => setShowNewProject(false)}
                    style={{ flex: 1, padding: '6px 0', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-3)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowNewProject(true)}
                style={{ padding: '10px 14px', background: 'transparent', border: '1px dashed var(--border-2)', borderRadius: 12, color: 'var(--text-3)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit' }}>
                <PlusCircle size={13} /> New Project
              </button>
            )}
          </div>

          {/* Right: project detail */}
          {project && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Project hero */}
              <motion.div key={project.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ ...card, padding: '16px 20px', border: `1px solid ${project.color}30` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: project.color, boxShadow: `0 0 12px ${project.color}`, flexShrink: 0 }} />
                  <h2 style={{ color: 'var(--text-1)', fontSize: 16, fontWeight: 800, margin: 0, flex: 1, minWidth: 120 }}>{project.name}</h2>
                  <button onClick={runAiOrganize} disabled={organizing}
                    style={{ padding: '7px 12px', background: 'linear-gradient(135deg,#6366f1,#7c3aed)', border: 'none', borderRadius: 9, color: '#fff', fontSize: 11.5, fontWeight: 700, cursor: organizing ? 'wait' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, opacity: organizing ? 0.7 : 1 }}>
                    {organizing ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Organizing…</> : <><Wand2 size={12} /> AI Organize</>}
                  </button>
                  <button onClick={() => deleteProject(project.id)}
                    style={{ padding: '7px 9px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, color: '#ef4444', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
                    title="Delete project">
                    <Trash2 size={12} />
                  </button>
                </div>
                {project.description && <p style={{ color: 'var(--text-3)', fontSize: 12, margin: '8px 0 0 20px' }}>{project.description}</p>}
              </motion.div>

              {/* Organize pipeline + result */}
              {organizePipeline && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <AgentPipeline agents={organizePipeline} title="AI Organize pipeline" />
                </motion.div>
              )}
              {organizeResult && organizeResult.suggested_folders.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  style={{ ...card, padding: '14px 18px', borderColor: 'rgba(99,102,241,0.3)', background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(124,58,237,0.04))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Wand2 size={14} color="#6366f1" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>Suggested folders ({organizeResult.suggested_folders.length})</span>
                    <button onClick={applyOrganizedFolders}
                      style={{ marginLeft: 'auto', padding: '5px 12px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Save size={11} /> Apply
                    </button>
                    <button onClick={() => { setOrganizeResult(null); setOrganizePipeline(null); }}
                      style={{ padding: '5px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-3)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <X size={11} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {organizeResult.suggested_folders.map(f => (
                      <div key={f.id} style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, fontSize: 11.5, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <FolderTree size={11} color="#6366f1" />{f.name}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Folders strip */}
              {project.folders && project.folders.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <FolderTree size={13} color="var(--text-3)" />
                  <button onClick={() => setActiveFolder('')}
                    style={{ padding: '5px 11px', background: activeFolder === '' ? project.color + '20' : 'var(--surface-2)', border: `1px solid ${activeFolder === '' ? project.color + '40' : 'var(--border)'}`, borderRadius: 14, color: activeFolder === '' ? 'var(--text-1)' : 'var(--text-3)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    All ({project.items?.length || 0})
                  </button>
                  {project.folders.map(f => {
                    const cnt = itemsForFolder(f.id).length;
                    const isAct = activeFolder === f.id;
                    return (
                      <button key={f.id} onClick={() => setActiveFolder(f.id)}
                        style={{ padding: '5px 11px', background: isAct ? project.color + '20' : 'var(--surface-2)', border: `1px solid ${isAct ? project.color + '40' : 'var(--border)'}`, borderRadius: 14, color: isAct ? 'var(--text-1)' : 'var(--text-3)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {f.name} ({cnt})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Two-column inner: Items + Tasks */}
              <div className="workspace-inner">
                {/* Items */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ color: 'var(--text-2)', fontWeight: 700, fontSize: 13 }}>
                      Resources & memories <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>· {visibleItems.length}</span>
                    </div>
                    <button onClick={() => navigate('/discover')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'inherit' }}>
                      <Plus size={12} /> Discover
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 480, overflowY: 'auto' }}>
                    <AnimatePresence>
                      {visibleItems.map(it => {
                        const isVid = it.meta?.type === 'video' || !!it.meta?.youtube_id;
                        return (
                          <motion.div key={it.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }}
                            style={{ display: 'flex', gap: 8, padding: '7px 9px', borderRadius: 8, background: 'var(--surface-2)', alignItems: 'center', position: 'relative' }}>
                            {isVid && it.meta?.thumbnail ? (
                              <img src={it.meta.thumbnail} alt="" style={{ width: 56, height: 32, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 24, height: 24, borderRadius: 5, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {isVid ? <Youtube size={12} color="#ef4444" /> : <FileText size={12} color="var(--primary)" />}
                              </div>
                            )}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ color: 'var(--text-1)', fontSize: 12, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{it.title}</div>
                              <div style={{ color: 'var(--text-3)', fontSize: 10, marginTop: 2, display: 'flex', gap: 5 }}>
                                {it.meta?.channel_title && <span>{it.meta.channel_title}</span>}
                                {it.meta?.duration_display && <span>· {it.meta.duration_display}</span>}
                                {it.meta?.domain && <span>{it.meta.domain}</span>}
                              </div>
                            </div>
                            {it.url && (
                              <a href={it.url} target="_blank" rel="noopener noreferrer"
                                style={{ color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: 4 }}>
                                <ExternalLink size={11} />
                              </a>
                            )}
                            <button onClick={() => removeItem(it.id)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 4, display: 'flex' }}
                              title="Remove">
                              <Trash2 size={11} />
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    {visibleItems.length === 0 && (
                      <p style={{ color: 'var(--text-3)', fontSize: 12, textAlign: 'center', padding: '20px 0', margin: 0 }}>
                        {activeFolder ? 'No items in this folder' : 'No resources yet — go to Discover or run the Plan Generator'}
                      </p>
                    )}
                  </div>
                </motion.div>

                {/* Tasks */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={{ ...card, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ color: 'var(--text-2)', fontWeight: 700, fontSize: 13 }}>
                      Tasks <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>· {visibleTasks.length}</span>
                    </div>
                    <span style={{ color: project.color, fontSize: 11, fontWeight: 700 }}>
                      {visibleTasks.length > 0 ? Math.round((visibleTasks.filter(t => t.done).length / visibleTasks.length) * 100) : 0}% done
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addTask(); }}
                      placeholder={activeFolder ? `New task in folder…` : 'New task…'}
                      style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', fontSize: 12, padding: '6px 10px', outline: 'none', fontFamily: 'inherit' }} />
                    <button onClick={addTask} disabled={!newTaskText.trim()}
                      style={{ padding: '6px 12px', background: 'var(--primary)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 700, cursor: !newTaskText.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: !newTaskText.trim() ? 0.5 : 1 }}>
                      Add
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 480, overflowY: 'auto' }}>
                    <AnimatePresence>
                      {visibleTasks.map(t => (
                        <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          onClick={() => toggleTask(t.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'var(--surface-2)', cursor: 'pointer' }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${t.done ? project.color : 'var(--border-2)'}`, background: t.done ? project.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {t.done && <CheckCheck size={10} color="#fff" />}
                          </div>
                          <span style={{ color: t.done ? 'var(--text-3)' : 'var(--text-2)', fontSize: 12, textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {visibleTasks.length === 0 && (
                      <p style={{ color: 'var(--text-3)', fontSize: 12, textAlign: 'center', padding: '16px 0', margin: 0 }}>No tasks yet</p>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkspacePage;
