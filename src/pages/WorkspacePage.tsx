import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Kanban, PlusCircle, Plus, CheckCheck } from 'lucide-react';
import { motion } from 'motion/react';
import type { Memory } from '../lib/types';

interface WorkspaceProject {
  id: string;
  name: string;
  color: string;
  description: string;
  memoryIds: string[];
  tasks: { id: string; text: string; done: boolean }[];
}

const WorkspaceView = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<WorkspaceProject[]>([
    { id: '1', name: 'AI/ML Research', color: '#00d4ff', description: 'Deep learning, neural networks, and AI research notes', memoryIds: [], tasks: [{ id: 't1', text: 'Study transformer architecture', done: false }, { id: 't2', text: 'Summarize GPT-4 paper', done: true }] },
    { id: '2', name: 'Business Strategy', color: '#8b5cf6', description: 'Market research, strategy frameworks, and growth ideas', memoryIds: [], tasks: [{ id: 't3', text: "Porter's Five Forces analysis", done: false }] },
    { id: '3', name: 'Personal Growth', color: '#10b981', description: 'Productivity, habits, and self-improvement captures', memoryIds: [], tasks: [] },
  ]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [activeProject, setActiveProject] = useState<string>(projects[0].id);
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [showNewTask, setShowNewTask] = useState(false);

  useEffect(() => {
    fetch('/memories?limit=30').then(r => r.ok ? r.json() : []).then(setMemories);
  }, []);

  const project = projects.find(p => p.id === activeProject)!;

  const addProject = () => {
    if (!newProjectName.trim()) return;
    const colors = ['#00d4ff', '#8b5cf6', '#f472b6', '#10b981', '#f59e0b', '#ef4444'];
    setProjects(prev => [...prev, { id: Date.now().toString(), name: newProjectName.trim(), color: colors[prev.length % colors.length], description: '', memoryIds: [], tasks: [] }]);
    setNewProjectName(''); setShowNewProject(false);
  };

  const toggleTask = (taskId: string) => {
    setProjects(prev => prev.map(p => p.id === activeProject ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t) } : p));
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    setProjects(prev => prev.map(p => p.id === activeProject ? { ...p, tasks: [...p.tasks, { id: Date.now().toString(), text: newTaskText.trim(), done: false }] } : p));
    setNewTaskText(''); setShowNewTask(false);
  };

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, backdropFilter: 'blur(20px)' } as React.CSSProperties;
  const projectMemories = memories.filter(m => m.domain.toLowerCase().includes(project.name.toLowerCase().split('/')[0].trim().toLowerCase()) || project.memoryIds.includes(m.id));

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Kanban size={17} color="#f59e0b" />
          </div>
          <div>
            <h1 style={{ color: 'var(--text-1)', fontSize: 22, fontWeight: 700, margin: 0 }}>Workspace</h1>
            <p style={{ color: 'var(--text-3)', fontSize: 12, margin: 0 }}>Organize knowledge into projects</p>
          </div>
        </div>
      </motion.div>

      <div className="workspace-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {projects.map((p, i) => (
            <motion.button key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => setActiveProject(p.id)}
              style={{ ...card, padding: '12px 14px', cursor: 'pointer', border: `1px solid ${activeProject === p.id ? p.color + '40' : 'var(--border)'}`, background: activeProject === p.id ? `${p.color}10` : 'var(--surface)', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, boxShadow: activeProject === p.id ? `0 0 8px ${p.color}` : 'none', flexShrink: 0 }} />
                <span style={{ color: activeProject === p.id ? 'var(--text-1)' : 'var(--text-3)', fontSize: 13, fontWeight: activeProject === p.id ? 600 : 400 }}>{p.name}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginLeft: 16 }}>
                <span style={{ color: 'var(--text-3)', fontSize: 10 }}>{p.tasks.length} tasks</span>
                <span style={{ color: 'var(--text-3)', fontSize: 10 }}>·</span>
                <span style={{ color: 'var(--text-3)', fontSize: 10 }}>{p.tasks.filter(t => t.done).length} done</span>
              </div>
            </motion.button>
          ))}
          {showNewProject ? (
            <div style={{ ...card, padding: '10px 12px' }}>
              <input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addProject()} placeholder="Project name..."
                style={{ width: '100%', background: 'none', border: 'none', color: 'var(--text-1)', fontSize: 12, outline: 'none', fontFamily: 'inherit', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={addProject} style={{ flex: 1, padding: '5px 0', background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 7, color: '#00d4ff', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                <button onClick={() => setShowNewProject(false)} style={{ flex: 1, padding: '5px 0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, color: '#6b7280', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowNewProject(true)}
              style={{ padding: '10px 14px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 14, color: '#4b5563', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget).style.borderColor = 'rgba(0,212,255,0.25)'; (e.currentTarget).style.color = '#00d4ff'; }}
              onMouseLeave={e => { (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget).style.color = '#4b5563'; }}>
              <PlusCircle size={13} /> New Project
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <motion.div key={activeProject} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ ...card, padding: '16px 20px', border: `1px solid ${project.color}25` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: project.color, boxShadow: `0 0 12px ${project.color}`, flexShrink: 0 }} />
              <h2 style={{ color: 'var(--text-1)', fontSize: 16, fontWeight: 700, margin: 0, flex: 1, minWidth: 120 }}>{project.name}</h2>
              <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{project.tasks.filter(t => !t.done).length} pending</span>
                <span style={{ color: project.color, fontSize: 11, fontWeight: 600 }}>{Math.round(project.tasks.length > 0 ? (project.tasks.filter(t => t.done).length / project.tasks.length) * 100 : 0)}% done</span>
              </div>
            </div>
            {project.description && <p style={{ color: 'var(--text-3)', fontSize: 12, margin: '8px 0 0 20px' }}>{project.description}</p>}
          </motion.div>

          <div className="workspace-inner">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ ...card, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ color: 'var(--text-2)', fontWeight: 600, fontSize: 13 }}>Tasks</div>
                <button onClick={() => setShowNewTask(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'inherit' }}>
                  <PlusCircle size={12} /> Add
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {project.tasks.map(t => (
                  <div key={t.id} onClick={() => toggleTask(t.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--surface-2)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${t.done ? project.color : 'var(--border-2)'}`, background: t.done ? project.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                      {t.done && <CheckCheck size={10} color="#fff" />}
                    </div>
                    <span style={{ color: t.done ? 'var(--text-3)' : 'var(--text-2)', fontSize: 12, textDecoration: t.done ? 'line-through' : 'none', transition: 'all 0.2s' }}>{t.text}</span>
                  </div>
                ))}
                {showNewTask && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <input autoFocus value={newTaskText} onChange={e => setNewTaskText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setShowNewTask(false); }}
                      placeholder="New task..."
                      style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-1)', fontSize: 12, padding: '5px 9px', outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                )}
                {project.tasks.length === 0 && !showNewTask && <p style={{ color: 'var(--text-3)', fontSize: 12, margin: '4px 0 0', textAlign: 'center', padding: '16px 0' }}>No tasks yet</p>}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ ...card, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ color: 'var(--text-2)', fontWeight: 600, fontSize: 13 }}>Related Memories</div>
                <button onClick={() => navigate('/capture')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'inherit' }}>
                  <Plus size={12} /> Capture
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {projectMemories.slice(0, 4).map(m => {
                  const clr = { youtube: '#ef4444', web: '#00d4ff', pdf: '#f59e0b', note: '#10b981' }[m.source_type] ?? '#6b7280';
                  return (
                    <div key={m.id} style={{ display: 'flex', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', alignItems: 'flex-start' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: clr, marginTop: 4, flexShrink: 0 }} />
                      <div style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
                        <div style={{ color: 'var(--text-1)', fontSize: 12, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                        <div style={{ color: 'var(--text-3)', fontSize: 10, marginTop: 2 }}>{m.domain}</div>
                      </div>
                    </div>
                  );
                })}
                {projectMemories.length === 0 && <p style={{ color: 'var(--text-3)', fontSize: 12, textAlign: 'center', padding: '16px 0', margin: 0 }}>No related memories yet</p>}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceView;
