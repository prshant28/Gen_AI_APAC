import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, CheckCircle2, Clock, Trash2, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const TasksModule = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', due_date: '' });
  const [tab, setTab] = useState<'pending' | 'completed'>('pending');

  const fetchTasks = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/tasks?status=pending&limit=50').then(r => r.ok ? r.json() : []),
      fetch('/tasks?status=completed&limit=20').then(r => r.ok ? r.json() : [])
    ]).then(([pending, completed]) => {
      setTasks(pending);
      setCompletedTasks(completed);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleCreate = async () => {
    if (!newTask.title.trim()) return;
    try {
      await fetch('/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTask) });
      setShowNewTask(false);
      setNewTask({ title: '', priority: 'medium', due_date: '' });
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  const handleComplete = async (id: string) => {
    try {
      await fetch(`/tasks/${id}/complete`, { method: 'POST' });
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await fetch(`/tasks/${id}`, { method: 'DELETE' });
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  const priorityColors: Record<string, string> = {
    high: 'bg-red-50 text-red-600 border-red-100',
    medium: 'bg-amber-50 text-amber-600 border-amber-100',
    low: 'bg-emerald-50 text-emerald-600 border-emerald-100'
  };

  const displayTasks = tab === 'pending' ? tasks : completedTasks;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Tasks</h2>
          <p className="text-slate-500 mt-1">{tasks.length} pending · {completedTasks.length} completed</p>
        </div>
        <button onClick={() => setShowNewTask(true)} className="rs-btn rs-btn-primary active:scale-95 flex items-center gap-2">
          <Plus className="w-4 h-4" />New Task
        </button>
      </header>

      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        {(['pending', 'completed'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-5 py-2 rounded-lg text-sm font-bold transition-all', tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t === 'pending' ? `Pending (${tasks.length})` : `Completed (${completedTasks.length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {displayTasks.map((task) => (
              <motion.div key={task.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-shadow">
                {tab === 'pending' ? (
                  <button onClick={() => handleComplete(task.id)}
                    className="w-6 h-6 rounded-full border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all shrink-0 flex items-center justify-center group/btn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                  </button>
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <p className={cn('font-bold text-slate-800', tab === 'completed' && 'line-through text-slate-400')}>{task.title}</p>
                  {task.due_date && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />Due: {task.due_date}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {task.priority && (
                    <span className={cn('text-[10px] font-bold px-2 py-1 rounded border uppercase', priorityColors[task.priority] || priorityColors.medium)}>
                      {task.priority}
                    </span>
                  )}
                  <button onClick={() => handleDelete(task.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {displayTasks.length === 0 && (
            <div className="py-20 text-center">
              <CheckSquare className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">{tab === 'pending' ? 'All caught up! No pending tasks.' : 'No completed tasks yet.'}</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showNewTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewTask(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6">
              <h3 className="text-xl font-bold text-slate-900">Create New Task</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Task Title</label>
                  <input autoFocus type="text" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="What needs to be done?"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Priority</label>
                    <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Due Date</label>
                    <input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNewTask(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={handleCreate} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all">Create Task</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TasksModule;
