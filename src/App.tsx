import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Brain, Search, CheckSquare, Calendar as CalendarIcon, LayoutDashboard, Plus,
  Youtube, Globe, FileText, StickyNote, Send, Loader2, Tag, Clock, ExternalLink,
  ChevronRight, CheckCircle2, X, Save, Sparkles, AlertCircle, Settings, Shield,
  AlertTriangle, Zap, Trash2, BookOpen, Target, TrendingUp, RotateCcw, ChevronLeft,
  GraduationCap, Lightbulb, FlipHorizontal, Award, Bell, Download, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type View = 'dashboard' | 'capture' | 'vault' | 'recall' | 'tasks' | 'calendar' | 'flashcards' | 'settings';

interface Memory {
  id: string;
  title: string;
  summary: string;
  key_points: string[];
  tags: string[];
  domain: string;
  source_type: 'youtube' | 'web' | 'pdf' | 'note';
  source_url?: string;
  created_at: string;
}

interface Flashcard {
  question: string;
  answer: string;
}

// ─── Sidebar ────────────────────────────────────────────────────────────────

const Sidebar = ({ currentView, setView, isCollapsed, setIsCollapsed }: {
  currentView: View; setView: (v: View) => void; isCollapsed: boolean; setIsCollapsed: (v: boolean) => void;
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'capture', label: 'Capture', icon: Plus },
    { id: 'vault', label: 'Vault', icon: Brain },
    { id: 'recall', label: 'Recall AI', icon: Search },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'flashcards', label: 'Flashcards', icon: FlipHorizontal },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <motion.div
      animate={{ width: isCollapsed ? 80 : 280 }}
      className="bg-slate-950 text-white h-screen flex flex-col border-r border-slate-800 shrink-0 relative z-50"
    >
      <div className="p-6 flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
          <Brain className="w-6 h-6 text-white" />
        </div>
        {!isCollapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-xl font-bold tracking-tight whitespace-nowrap">Recall X247</h1>
            <p className="text-[10px] text-indigo-400 font-medium uppercase tracking-widest">Powered by OpenAI</p>
          </motion.div>
        )}
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
              currentView === item.id
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
            )}
          >
            <item.icon className={cn("w-5 h-5 shrink-0 transition-transform", currentView === item.id ? "scale-110" : "group-hover:scale-110")} />
            {!isCollapsed && (
              <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="font-medium whitespace-nowrap">
                {item.label}
              </motion.span>
            )}
            {currentView === item.id && !isCollapsed && (
              <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        <div className={cn("bg-slate-900/50 rounded-2xl border border-slate-800/50 transition-all overflow-hidden", isCollapsed ? "p-2" : "p-4")}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">PM</div>
            {!isCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Prashant Maurya</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Pro Plan</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600 transition-all shadow-xl z-50"
      >
        <ChevronRight className={cn("w-4 h-4 transition-transform", !isCollapsed && "rotate-180")} />
      </button>
    </motion.div>
  );
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

const Dashboard = ({ setView }: { setView: (v: View) => void }) => {
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<Memory[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [briefing, setBriefing] = useState<string>('');
  const [briefingLoading, setBriefingLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, memoriesRes, logsRes] = await Promise.all([
          fetch('/stats').then(r => r.ok ? r.json() : null),
          fetch('/memories?limit=5').then(r => r.ok ? r.json() : []),
          fetch('/logs?limit=5').then(r => r.ok ? r.json() : [])
        ]);
        if (statsRes) setStats(statsRes);
        if (memoriesRes) setRecent(memoriesRes);
        if (logsRes) setLogs(logsRes);
      } catch (err) { console.error("Dashboard fetch error:", err); }
    };
    const fetchBriefing = async () => {
      try {
        const res = await fetch('/briefing');
        if (res.ok) {
          const data = await res.json();
          setBriefing(data.briefing);
        }
      } catch { setBriefing('Ready for another great day of learning!'); }
      finally { setBriefingLoading(false); }
    };
    fetchData();
    fetchBriefing();
  }, []);

  const statCards = [
    { label: 'Total Memories', value: stats?.total_memories ?? 0, icon: Brain, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Pending Tasks', value: stats?.pending_tasks ?? 0, icon: CheckSquare, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'AI Interactions', value: stats?.ai_interactions ?? 0, icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Knowledge Domains', value: stats?.knowledge_domains?.length ?? 0, icon: Globe, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Welcome back, Prashant</h2>
          <p className="text-slate-500 mt-1">Here's what's happening in your Second Brain today.</p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-2xl text-white max-w-md shadow-lg shadow-indigo-600/20"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-200 mb-1">AI Daily Briefing</p>
              {briefingLoading ? (
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />)}
                </div>
              ) : (
                <p className="text-sm text-white/90 leading-relaxed">{briefing}</p>
              )}
            </div>
          </div>
        </motion.div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Recent Memories</h3>
            <button onClick={() => setView('vault')} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View all →</button>
          </div>
          <div className="space-y-3">
            {recent.length > 0 ? recent.map((memory) => (
              <div key={memory.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex gap-4 hover:border-indigo-100 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                  {memory.source_type === 'youtube' && <Youtube className="w-5 h-5 text-red-500" />}
                  {memory.source_type === 'web' && <Globe className="w-5 h-5 text-blue-500" />}
                  {memory.source_type === 'pdf' && <FileText className="w-5 h-5 text-orange-500" />}
                  {memory.source_type === 'note' && <StickyNote className="w-5 h-5 text-amber-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{memory.title}</h4>
                  <p className="text-sm text-slate-500 line-clamp-1 mt-1">{memory.summary}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">{memory.domain}</span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />{new Date(memory.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 border-dashed">
                <Brain className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">No memories yet</p>
                <button onClick={() => setView('capture')} className="mt-3 text-sm text-indigo-600 font-bold hover:underline">Capture your first memory →</button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">Recent AI Interactions</h3>
            <div className="bg-white rounded-3xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
              {logs.length > 0 ? logs.map((log, i) => (
                <div key={i} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">{log.user_message}</p>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-4">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 italic">"{log.reply}"</p>
                </div>
              )) : (
                <div className="p-8 text-center text-slate-400">No interactions yet. Try the Recall AI!</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900">Knowledge Domains</h3>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
            {stats?.knowledge_domains?.length > 0 ? stats.knowledge_domains.map((domain: any) => (
              <div key={domain.name} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{domain.name}</span>
                  <span className="text-slate-400 font-bold">{domain.value}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(domain.value / (stats.total_memories || 1)) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                  />
                </div>
              </div>
            )) : (
              <div className="py-8 text-center">
                <Target className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Start capturing to see domain stats</p>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-3xl border border-indigo-100 space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-500" />
              Quick Actions
            </h3>
            {[
              { label: 'Capture new knowledge', icon: Plus, view: 'capture' as View, color: 'bg-indigo-600 text-white' },
              { label: 'Ask Recall AI', icon: Search, view: 'recall' as View, color: 'bg-white text-slate-700 border border-slate-200' },
              { label: 'Study Flashcards', icon: FlipHorizontal, view: 'flashcards' as View, color: 'bg-white text-slate-700 border border-slate-200' },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => setView(a.view)}
                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-sm", a.color)}
              >
                <a.icon className="w-4 h-4" />
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Capture View ─────────────────────────────────────────────────────────────

const CaptureView = () => {
  const [activeTab, setActiveTab] = useState<'url' | 'text' | 'pdf'>('url');
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<Memory | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCapture = async () => {
    if (activeTab === 'pdf' && pdfFile) {
      setIsProcessing(true);
      try {
        const formData = new FormData();
        formData.append('file', pdfFile);
        const res = await fetch('/capture/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (!res.ok) throw new Error(data.detail || 'Upload failed');
        showToast('PDF captured and saved to Vault!');
        setPdfFile(null);
      } catch (err: any) {
        alert(err.message || 'Failed to process PDF.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (!input.trim()) return;
    setIsProcessing(true);
    try {
      const isYoutube = input.includes('youtube.com') || input.includes('youtu.be');
      const source_type = activeTab === 'url' ? (isYoutube ? 'youtube' : 'web') : 'note';
      const res = await fetch('/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type,
          url: activeTab === 'url' ? input : '',
          content: activeTab === 'text' ? input : '',
          preview: true
        })
      });
      if (res.status === 401) {
        const data = await res.json();
        throw new Error(data.error || "Unauthorized: Check API configuration.");
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPreview(data);
    } catch (err: any) {
      alert(err.message || 'Failed to analyze content.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preview)
      });
      if (res.ok) {
        setPreview(null);
        setInput('');
        showToast('Saved to Vault!');
      }
    } catch (err) { console.error(err); }
    finally { setIsProcessing(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') setPdfFile(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-[200] bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold"
          >
            <CheckCircle2 className="w-5 h-5" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="text-center">
        <h2 className="text-3xl font-bold text-slate-900">Capture Knowledge</h2>
        <p className="text-slate-500 mt-2">Feed your Second Brain with YouTube videos, web articles, PDFs, or notes.</p>
      </header>

      {!preview ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
          <div className="flex border-b border-slate-100">
            {[
              { id: 'url', label: 'URL / YouTube', icon: Globe },
              { id: 'text', label: 'Quick Note', icon: StickyNote },
              { id: 'pdf', label: 'PDF Upload', icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-4 font-medium transition-colors text-sm",
                  activeTab === tab.id ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-8 space-y-6">
            {activeTab === 'url' && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Article or YouTube URL</label>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCapture()}
                  placeholder="https://example.com/article or https://youtube.com/watch?v=..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
                <p className="text-xs text-slate-400">Supports any web article or YouTube video URL</p>
              </div>
            )}

            {activeTab === 'text' && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Paste your notes or ideas</label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type or paste anything — meeting notes, ideas, research snippets..."
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                />
              </div>
            )}

            {activeTab === 'pdf' && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !pdfFile && fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-12 text-center space-y-4 transition-colors cursor-pointer",
                  dragOver ? "border-indigo-400 bg-indigo-50" : pdfFile ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                )}
              >
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && setPdfFile(e.target.files[0])} />
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                  {pdfFile ? <CheckCircle2 className="w-8 h-8 text-emerald-500" /> : <Upload className="w-8 h-8 text-slate-400" />}
                </div>
                {pdfFile ? (
                  <div>
                    <p className="font-bold text-emerald-700">{pdfFile.name}</p>
                    <p className="text-sm text-emerald-600">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB — Ready to process</p>
                    <button onClick={(e) => { e.stopPropagation(); setPdfFile(null); }} className="mt-2 text-xs text-slate-400 hover:text-red-500 transition-colors">Remove file</button>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-slate-700">Drop PDF here or click to upload</p>
                    <p className="text-sm text-slate-400">AI will extract and analyze the content</p>
                    <p className="text-xs text-slate-300 mt-1">Max 10MB</p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleCapture}
              disabled={isProcessing || (activeTab !== 'pdf' && !input.trim()) || (activeTab === 'pdf' && !pdfFile)}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 animate-spin" />AI is analyzing...</>
              ) : (
                <><Sparkles className="w-5 h-5 text-indigo-400" />Process with OpenAI</>
              )}
            </button>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-8 text-white flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-1 bg-indigo-500 rounded text-[10px] font-bold uppercase tracking-widest">Analyzed by OpenAI</span>
                <span className="px-2 py-1 bg-white/10 rounded text-[10px] font-bold uppercase tracking-widest">{preview.domain}</span>
                <span className="px-2 py-1 bg-white/10 rounded text-[10px] font-bold uppercase tracking-widest">{preview.source_type}</span>
              </div>
              <h3 className="text-2xl font-bold">{preview.title}</h3>
            </div>
            <button onClick={() => setPreview(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8 space-y-8">
            <section className="space-y-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-2"><Brain className="w-4 h-4 text-indigo-500" />Summary</h4>
              <p className="text-slate-600 leading-relaxed">{preview.summary}</p>
            </section>

            <section className="space-y-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Key Insights</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {preview.key_points.map((point, i) => (
                  <li key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl text-sm text-slate-700 border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                    {point}
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-2"><Tag className="w-4 h-4 text-amber-500" />Tags</h4>
              <div className="flex flex-wrap gap-2">
                {preview.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">#{tag}</span>
                ))}
              </div>
            </section>

            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <button onClick={() => setPreview(null)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Discard</button>
              <button
                onClick={handleSave}
                disabled={isProcessing}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save to Vault
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── Vault View ───────────────────────────────────────────────────────────────

const VaultView = ({ setView }: { setView: (v: View) => void }) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [flashcardsMemory, setFlashcardsMemory] = useState<Memory | null>(null);

  const fetchMemories = useCallback(() => {
    setIsLoading(true);
    const url = domainFilter ? `/memories?domain=${domainFilter}&limit=50` : '/memories?limit=50';
    fetch(url).then(r => r.ok ? r.json() : []).then(data => {
      setMemories(data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [domainFilter]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this memory? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await fetch(`/memories/${id}`, { method: 'DELETE' });
      setMemories(prev => prev.filter(m => m.id !== id));
      if (selectedMemory?.id === id) setSelectedMemory(null);
    } catch (err) { console.error(err); }
    finally { setDeletingId(null); }
  };

  const filtered = memories.filter(m =>
    m.title.toLowerCase().includes(filter.toLowerCase()) ||
    m.tags.some(t => t.toLowerCase().includes(filter.toLowerCase())) ||
    m.summary.toLowerCase().includes(filter.toLowerCase())
  );

  const domains = ['', 'AI', 'Technology', 'Science', 'Business', 'Health', 'History', 'Philosophy', 'Engineering', 'Productivity', 'Other'];

  const sourceIcon = (type: string) => {
    if (type === 'youtube') return <Youtube className="w-5 h-5 text-red-500" />;
    if (type === 'web') return <Globe className="w-5 h-5 text-blue-500" />;
    if (type === 'pdf') return <FileText className="w-5 h-5 text-orange-500" />;
    return <StickyNote className="w-5 h-5 text-amber-500" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Knowledge Vault</h2>
          <p className="text-slate-500 mt-1">{memories.length} memories captured in your Second Brain.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search memories..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-60 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
          >
            {domains.map(d => <option key={d} value={d}>{d || 'All Domains'}</option>)}
          </select>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((memory) => (
            <motion.div
              key={memory.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                  {sourceIcon(memory.source_type)}
                </div>
                <div className="flex items-center gap-1">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase">{memory.domain}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFlashcardsMemory(memory); }}
                    title="Generate Flashcards"
                    className="p-1.5 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition-colors text-slate-300"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(memory.id); }}
                    disabled={deletingId === memory.id}
                    title="Delete memory"
                    className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-300"
                  >
                    {deletingId === memory.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <h4 onClick={() => setSelectedMemory(memory)} className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors cursor-pointer">{memory.title}</h4>
              <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-1">{memory.summary}</p>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {memory.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-bold">#{tag}</span>
                ))}
                {memory.tags.length > 3 && <span className="text-[10px] text-slate-400 font-bold self-center">+{memory.tags.length - 3}</span>}
              </div>

              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />{new Date(memory.created_at).toLocaleDateString()}
                </span>
                <button onClick={() => setSelectedMemory(memory)} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700">View details →</button>
              </div>
            </motion.div>
          ))}
          {!isLoading && filtered.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400">
              <Brain className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-medium">No memories found</p>
            </div>
          )}
        </div>
      )}

      {/* Memory Detail Modal */}
      <AnimatePresence>
        {selectedMemory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedMemory(null)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-8 text-white flex justify-between items-start shrink-0">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-indigo-500 rounded text-[10px] font-bold uppercase">{selectedMemory.source_type}</span>
                    <span className="px-2 py-1 bg-white/10 rounded text-[10px] font-bold uppercase">{selectedMemory.domain}</span>
                  </div>
                  <h3 className="text-2xl font-bold">{selectedMemory.title}</h3>
                </div>
                <button onClick={() => setSelectedMemory(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 space-y-8 overflow-y-auto">
                <section className="space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2"><Brain className="w-4 h-4 text-indigo-500" />Summary</h4>
                  <p className="text-slate-600 leading-relaxed">{selectedMemory.summary}</p>
                </section>
                <section className="space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Key Insights</h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedMemory.key_points.map((point, i) => (
                      <li key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl text-sm text-slate-700 border border-slate-100">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2"><Tag className="w-4 h-4 text-amber-500" />Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMemory.tags.map(tag => (
                      <span key={tag} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">#{tag}</span>
                    ))}
                  </div>
                </section>
                {selectedMemory.source_url && (
                  <section className="pt-6 border-t border-slate-100 flex gap-3">
                    <a href={selectedMemory.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700">
                      <ExternalLink className="w-4 h-4" />View Original Source
                    </a>
                    <button onClick={() => { setFlashcardsMemory(selectedMemory); setSelectedMemory(null); }} className="flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-700">
                      <FlipHorizontal className="w-4 h-4" />Generate Flashcards
                    </button>
                  </section>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Flashcard Generator Modal */}
      <AnimatePresence>
        {flashcardsMemory && (
          <FlashcardGeneratorModal memory={flashcardsMemory} onClose={() => setFlashcardsMemory(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Flashcard Generator Modal ────────────────────────────────────────────────

const FlashcardGeneratorModal = ({ memory, onClose }: { memory: Memory; onClose: () => void }) => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    fetch(`/memories/${memory.id}/flashcards`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.flashcards) setFlashcards(data.flashcards); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [memory.id]);

  const next = () => { setFlipped(false); setCurrentIndex(i => (i + 1) % flashcards.length); };
  const prev = () => { setFlipped(false); setCurrentIndex(i => (i - 1 + flashcards.length) % flashcards.length); };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white flex justify-between items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-100">AI Flashcards</p>
            <h3 className="text-lg font-bold mt-1 line-clamp-1">{memory.title}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
              <p className="text-slate-500 font-medium">Generating flashcards with OpenAI...</p>
            </div>
          ) : flashcards.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-sm text-slate-400 font-medium">
                <span>Card {currentIndex + 1} of {flashcards.length}</span>
                <div className="flex gap-1">
                  {flashcards.map((_, i) => (
                    <div key={i} className={cn("w-2 h-2 rounded-full", i === currentIndex ? "bg-amber-500" : "bg-slate-200")} />
                  ))}
                </div>
              </div>

              <motion.div
                key={`${currentIndex}-${flipped}`}
                initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                onClick={() => setFlipped(!flipped)}
                className={cn(
                  "min-h-[200px] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer border-2 transition-colors",
                  flipped ? "bg-indigo-50 border-indigo-200" : "bg-amber-50 border-amber-200"
                )}
              >
                <div className={cn("text-xs font-bold uppercase tracking-widest mb-4", flipped ? "text-indigo-400" : "text-amber-400")}>
                  {flipped ? "Answer" : "Question"}
                </div>
                <p className={cn("text-lg font-semibold leading-relaxed", flipped ? "text-indigo-800" : "text-amber-800")}>
                  {flipped ? flashcards[currentIndex].answer : flashcards[currentIndex].question}
                </p>
                <p className="text-xs text-slate-400 mt-4">Click to {flipped ? 'see question' : 'reveal answer'}</p>
              </motion.div>

              <div className="flex gap-3">
                <button onClick={prev} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
                  <ChevronLeft className="w-4 h-4" />Prev
                </button>
                <button onClick={() => setFlipped(!flipped)} className="px-6 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />Flip
                </button>
                <button onClick={next} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
                  Next<ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">Failed to generate flashcards.</div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ─── Flashcards View ──────────────────────────────────────────────────────────

const FlashcardsView = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/memories?limit=30').then(r => r.ok ? r.json() : []).then(data => {
      setMemories(data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">AI Flashcards</h2>
        <p className="text-slate-500 mt-1">Select any memory to generate interactive flashcards powered by OpenAI.</p>
      </header>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4">
        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
          <Lightbulb className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-amber-900">How it works</h3>
          <p className="text-sm text-amber-700 mt-1">OpenAI generates 5 Q&A flashcards from any saved memory. Click on a memory card below to start studying. Flip each card to reveal the answer.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-amber-500 animate-spin" /></div>
      ) : memories.length === 0 ? (
        <div className="py-20 text-center">
          <FlipHorizontal className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No memories yet. Capture some content first!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {memories.map((memory) => (
            <motion.button
              key={memory.id}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedMemory(memory)}
              className="bg-white rounded-3xl border border-slate-100 p-6 text-left flex flex-col gap-4 hover:shadow-xl hover:border-amber-200 transition-all duration-300 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                  <FlipHorizontal className="w-5 h-5 text-amber-500" />
                </div>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase">{memory.domain}</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 line-clamp-2 group-hover:text-amber-600 transition-colors">{memory.title}</h4>
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">{memory.summary}</p>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-amber-600 font-bold">Generate 5 flashcards</span>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedMemory && (
          <FlashcardGeneratorModal memory={selectedMemory} onClose={() => setSelectedMemory(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Recall View ─────────────────────────────────────────────────────────────

const RecallView = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; sources?: any[]; agents?: string[] }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, session_id: 'web_session_' + Date.now() })
      });
      if (res.status === 401) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: `Authorization Error: ${data.error || "Check API configuration."}` }]);
        return;
      }
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, sources: data.sources, agents: data.agents_called }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = [
    "What have I learned about AI recently?",
    "Summarize my saved notes on productivity",
    "What are the key points from my YouTube captures?",
    "Create a task to review my recent memories",
  ];

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-10rem)] flex flex-col animate-in slide-in-from-bottom-4 duration-500">
      <header className="text-center mb-6">
        <h2 className="text-3xl font-bold text-slate-900">Recall AI</h2>
        <p className="text-slate-500 mt-2">Powered by OpenAI GPT — ask anything about your saved knowledge.</p>
      </header>

      <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-slate-50/30">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
                <Brain className="w-10 h-10 text-indigo-400" />
              </div>
              <div>
                <p className="font-bold text-slate-700 text-lg">Ask your Second Brain</p>
                <p className="text-sm text-slate-400 max-w-sm mt-1">The AI will search through all your saved memories, tasks, and notes to answer your questions.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); }}
                    className="p-3 bg-white rounded-xl border border-slate-200 text-sm text-left text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-all font-medium"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "")}>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm", msg.role === 'user' ? "bg-indigo-600 text-white" : "bg-gradient-to-br from-slate-800 to-indigo-900 text-white")}>
                {msg.role === 'user' ? <Plus className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
              </div>
              <div className="space-y-2 max-w-[80%]">
                <div className={cn("p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap", msg.role === 'user' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none border border-slate-100")}>
                  {msg.content}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((source: any) => (
                      <div key={source.id} className="px-2 py-1 bg-indigo-50 border border-indigo-100 rounded text-[10px] font-bold text-indigo-500 flex items-center gap-1">
                        <Brain className="w-3 h-3" />{source.title}
                      </div>
                    ))}
                  </div>
                )}
                {msg.agents && msg.agents.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {msg.agents.map(a => (
                      <span key={a} className="px-2 py-0.5 bg-purple-50 text-purple-500 rounded text-[9px] font-bold uppercase">🤖 {a}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-indigo-900 text-white flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4" />
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 flex gap-1.5 shadow-sm items-center">
                {[0, 1, 2].map(i => <span key={i} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />)}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="relative flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask your Second Brain... (Enter to send)"
              rows={1}
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all resize-none text-sm"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 transition-all shadow-lg shadow-indigo-600/20 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Tasks View ───────────────────────────────────────────────────────────────

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
      await fetch('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
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
        <button
          onClick={() => setShowNewTask(true)}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />New Task
        </button>
      </header>

      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        {(['pending', 'completed'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn("px-5 py-2 rounded-lg text-sm font-bold transition-all", tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
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
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-shadow"
              >
                {tab === 'pending' ? (
                  <button
                    onClick={() => handleComplete(task.id)}
                    className="w-6 h-6 rounded-full border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all shrink-0 flex items-center justify-center group/btn"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                  </button>
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <p className={cn("font-bold text-slate-800", tab === 'completed' && "line-through text-slate-400")}>{task.title}</p>
                  {task.due_date && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />Due: {task.due_date}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {task.priority && (
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded border uppercase", priorityColors[task.priority] || priorityColors.medium)}>
                      {task.priority}
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
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
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <h3 className="text-xl font-bold text-slate-900">Create New Task</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Task Title</label>
                  <input
                    autoFocus
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="What needs to be done?"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Priority</label>
                    <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Due Date</label>
                    <input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
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

// ─── Calendar View ────────────────────────────────────────────────────────────

const CalendarModule = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [showStudyPlan, setShowStudyPlan] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '', duration_minutes: 60 });
  const [studyPlanTopic, setStudyPlanTopic] = useState('');
  const [studyPlan, setStudyPlan] = useState<any[]>([]);
  const [planLoading, setPlanLoading] = useState(false);
  const today = new Date();

  const fetchEvents = () => {
    setIsLoading(true);
    fetch('/schedule').then(r => r.ok ? r.json() : []).then(data => {
      setEvents(data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time) return;
    try {
      await fetch('/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      });
      setShowNewEvent(false);
      setNewEvent({ title: '', date: '', time: '', duration_minutes: 60 });
      fetchEvents();
    } catch (err) { console.error(err); }
  };

  const handleGeneratePlan = async () => {
    setPlanLoading(true);
    try {
      const res = await fetch('/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: studyPlanTopic, days: 7 })
      });
      const data = await res.json();
      if (data.plan) setStudyPlan(data.plan);
    } catch (err) { console.error(err); }
    finally { setPlanLoading(false); }
  };

  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Schedule</h2>
          <p className="text-slate-500 mt-1">Manage study sessions and knowledge review events.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowStudyPlan(true)}
            className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-100 transition-all flex items-center gap-2"
          >
            <GraduationCap className="w-4 h-4" />AI Study Plan
          </button>
          <button
            onClick={() => setShowNewEvent(true)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />New Event
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">{today.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = day === today.getDate();
              const dayEvents = events.filter(e => new Date(e.date).getDate() === day);
              return (
                <div
                  key={day}
                  className={cn("aspect-square rounded-xl flex flex-col p-1.5 transition-colors cursor-default text-center", isToday ? "bg-indigo-600 text-white" : "hover:bg-slate-50")}
                >
                  <span className={cn("text-xs font-bold", isToday ? "text-white" : "text-slate-500")}>{day}</span>
                  <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                    {dayEvents.slice(0, 3).map((_, ei) => (
                      <div key={ei} className={cn("w-1.5 h-1.5 rounded-full", isToday ? "bg-white/60" : "bg-indigo-500")} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-slate-900">Upcoming Events</h3>
          {isLoading ? (
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          ) : events.length > 0 ? events.slice(0, 8).map(event => (
            <div key={event.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-xs font-bold text-indigo-600 mb-1">{event.date} · {event.time}</p>
              <h4 className="font-bold text-slate-800 text-sm line-clamp-2">{event.title}</h4>
              <p className="text-[10px] text-slate-400 mt-1">{event.duration_minutes} mins</p>
            </div>
          )) : (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No upcoming events</p>
            </div>
          )}
        </div>
      </div>

      {/* New Event Modal */}
      <AnimatePresence>
        {showNewEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewEvent(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6">
              <h3 className="text-xl font-bold text-slate-900">Schedule Event</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Event Title</label>
                  <input type="text" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Study session, review, etc." className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date</label>
                    <input type="date" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time</label>
                    <input type="time" value={newEvent.time} onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duration (minutes)</label>
                  <input type="number" value={newEvent.duration_minutes} onChange={(e) => setNewEvent({ ...newEvent, duration_minutes: parseInt(e.target.value) })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" min="15" step="15" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowNewEvent(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50">Cancel</button>
                <button onClick={handleCreateEvent} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700">Schedule</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Study Plan Modal */}
      <AnimatePresence>
        {showStudyPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowStudyPlan(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex justify-between items-center shrink-0">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">OpenAI Powered</p>
                  <h3 className="text-xl font-bold mt-1">7-Day Study Plan Generator</h3>
                </div>
                <button onClick={() => setShowStudyPlan(false)} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {studyPlan.length === 0 ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Focus Topic (optional)</label>
                      <input
                        type="text"
                        value={studyPlanTopic}
                        onChange={(e) => setStudyPlanTopic(e.target.value)}
                        placeholder="e.g., Machine Learning, Python, History..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <p className="text-xs text-slate-400">Leave empty to base the plan on all your saved memories</p>
                    </div>
                    <button
                      onClick={handleGeneratePlan}
                      disabled={planLoading}
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                      {planLoading ? <><Loader2 className="w-5 h-5 animate-spin" />Generating Plan...</> : <><GraduationCap className="w-5 h-5" />Generate 7-Day Study Plan</>}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-900">Your Personalized Study Plan</h4>
                      <button onClick={() => setStudyPlan([])} className="text-sm text-indigo-600 font-bold hover:underline">Generate New</button>
                    </div>
                    {studyPlan.map((day: any) => (
                      <div key={day.day} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-xs font-bold text-indigo-600 uppercase">Day {day.day} · {day.date}</span>
                            <h5 className="font-bold text-slate-900 mt-0.5">{day.title}</h5>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-400">{day.duration_minutes} min</span>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">{day.focus_area}</p>
                          </div>
                        </div>
                        <ul className="space-y-1.5">
                          {day.activities?.map((activity: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full shrink-0" />
                              {activity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Settings View ─────────────────────────────────────────────────────────────

const SettingsView = () => {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetch('/settings').then(r => r.ok ? r.json() : null).then(data => {
      setSettings(data);
      setIsLoading(false);
    });
  }, []);

  const handleTestAI = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/test-ai');
      const data = await res.json();
      if (res.ok) setTestResult({ status: 'success', message: `${data.message} (Model: ${data.model})` });
      else setTestResult({ status: 'error', message: data.detail || 'Test failed' });
    } catch { setTestResult({ status: 'error', message: 'Network error occurred' }); }
    finally { setIsTesting(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Settings & Status</h2>
        <p className="text-slate-500 mt-1">Configure AI models and monitor system health.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />AI Configuration
          </h3>

          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Active AI Provider</p>
                <p className="text-lg font-bold text-indigo-900">{settings?.ai_provider === 'openai' ? 'OpenAI GPT' : 'Google Gemini'}</p>
                <p className="text-xs text-indigo-500">{settings?.openai_model || settings?.gemini_model}</p>
              </div>

              {[
                { label: 'GEN_APAC_API_KEY (Primary)', value: settings?.gen_apac_api_key_set, key: 'GEN_APAC_API_KEY' },
                { label: 'OpenAI API Key (Fallback)', value: settings?.openai_api_key_set, key: 'OPENAI_API_KEY' },
                { label: 'Google Gemini Key', value: settings?.gemini_api_key_set, key: 'GEMINI_API_KEY' },
                { label: 'Google Calendar', value: settings?.google_calendar_configured, key: 'GOOGLE_CALENDAR_ID' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-3 border-b border-slate-50">
                  <span className="text-sm text-slate-500 font-medium">{item.label}</span>
                  <span className={cn("text-xs font-bold px-2 py-1 rounded", item.value ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500")}>
                    {item.value ? '✓ CONFIGURED' : '✗ MISSING'}
                  </span>
                </div>
              ))}

              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-slate-500 font-medium">GCP Project</span>
                <span className="text-xs font-bold text-slate-600">{settings?.gcp_project_id || 'N/A'}</span>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-50">
            <button
              onClick={handleTestAI}
              disabled={isTesting || !(settings?.gen_apac_api_key_set || settings?.openai_api_key_set)}
              className={cn("w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                (settings?.gen_apac_api_key_set || settings?.openai_api_key_set) ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Test OpenAI Connection
            </button>
            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("mt-4 p-4 rounded-2xl text-xs flex gap-3", testResult.status === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100")}
              >
                {testResult.status === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <p>{testResult.message}</p>
              </motion.div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-500" />System Status
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Backend Server', value: 'HEALTHY', color: 'text-emerald-600', pulse: true },
                { label: 'Firestore Database', value: 'CONNECTED', color: 'text-emerald-600' },
                { label: 'AI Provider', value: settings?.ai_provider === 'openai' ? 'OpenAI GPT-4o Mini' : 'Gemini Flash', color: 'text-indigo-600' },
                { label: 'App Version', value: 'v2.0.0 HACKATHON', color: 'text-slate-400' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-500 font-medium">{item.label}</span>
                  <span className={cn("text-xs font-bold flex items-center gap-1.5", item.color)}>
                    {item.pulse && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-3xl text-white">
            <h3 className="font-bold text-lg mb-2">🏆 Hackathon Features</h3>
            <ul className="space-y-2 text-sm text-indigo-100">
              {[
                'Multi-agent AI orchestration (OpenAI)',
                'YouTube transcript extraction',
                'Web scraping & summarization',
                'PDF knowledge capture',
                'AI flashcard generation',
                'Personalized study plan AI',
                'Daily AI briefing',
                'Semantic recall search',
                'Google Firestore persistence',
                'Google Calendar integration',
              ].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-300 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [isReady, setIsReady] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowCommandPalette(true); }
      if (e.key === 'Escape') setShowCommandPalette(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { clearTimeout(timer); window.removeEventListener('keydown', handleKeyDown); };
  }, []);

  if (!isReady) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <p className="text-slate-400 font-medium animate-pulse">Initializing Second Brain...</p>
        </motion.div>
      </div>
    );
  }

  const commands = [
    { icon: Plus, label: 'Capture new memory', view: 'capture' as View },
    { icon: Search, label: 'Ask Recall AI', view: 'recall' as View },
    { icon: CheckSquare, label: 'Manage tasks', view: 'tasks' as View },
    { icon: Brain, label: 'Open Knowledge Vault', view: 'vault' as View },
    { icon: FlipHorizontal, label: 'Study Flashcards', view: 'flashcards' as View },
    { icon: CalendarIcon, label: 'View Schedule', view: 'calendar' as View },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <div className="hidden lg:block">
        <Sidebar currentView={view} setView={setView} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] lg:hidden" />
            <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed inset-y-0 left-0 w-[280px] z-[70] lg:hidden">
              <Sidebar currentView={view} setView={(v) => { setView(v); setIsMobileMenuOpen(false); }} isCollapsed={false} setIsCollapsed={() => {}} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto relative">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <div className="space-y-1.5">{[0, 1, 2].map(i => <div key={i} className="w-5 h-0.5 bg-slate-600 rounded-full" />)}</div>
            </button>
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search anything... (Cmd + K)"
                onFocus={() => setShowCommandPalette(true)}
                readOnly
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent border focus:bg-white focus:border-indigo-500 rounded-xl text-sm outline-none transition-all cursor-pointer"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-indigo-600">OpenAI Active</span>
            </div>
            <button
              onClick={() => setView('capture')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />Capture
            </button>
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {view === 'dashboard' && <Dashboard setView={setView} />}
              {view === 'capture' && <CaptureView />}
              {view === 'vault' && <VaultView setView={setView} />}
              {view === 'recall' && <RecallView />}
              {view === 'tasks' && <TasksModule />}
              {view === 'flashcards' && <FlashcardsView />}
              {view === 'calendar' && <CalendarModule />}
              {view === 'settings' && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {showCommandPalette && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCommandPalette(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -20 }} className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <Search className="w-5 h-5 text-indigo-500" />
                <input autoFocus type="text" placeholder="Type a command or navigate..." className="flex-1 text-lg outline-none placeholder:text-slate-400" />
                <div className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500">ESC</div>
              </div>
              <div className="p-2 max-h-[60vh] overflow-y-auto">
                <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Navigation</div>
                {commands.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { setView(item.view); setShowCommandPalette(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-slate-50 rounded-xl transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-slate-100 transition-all">
                      <item.icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <span className="flex-1 text-left text-sm font-medium text-slate-700">{item.label}</span>
                  </button>
                ))}
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <p className="text-[10px] text-slate-400">↑↓ Navigate · Enter to select · Esc to close</p>
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-indigo-300" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recall X247 · OpenAI</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
