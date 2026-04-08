import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  Search, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  LayoutDashboard, 
  Plus, 
  Youtube, 
  Globe, 
  FileText, 
  StickyNote,
  Send,
  Loader2,
  Tag,
  Clock,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  X,
  Save,
  Sparkles,
  AlertCircle,
  Settings,
  Shield,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type View = 'dashboard' | 'capture' | 'vault' | 'recall' | 'tasks' | 'calendar' | 'settings';

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

// --- Components ---

const Sidebar = ({ currentView, setView, isCollapsed, setIsCollapsed }: { currentView: View, setView: (v: View) => void, isCollapsed: boolean, setIsCollapsed: (v: boolean) => void }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'capture', label: 'Capture', icon: Plus },
    { id: 'vault', label: 'Vault', icon: Brain },
    { id: 'recall', label: 'Recall', icon: Search },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
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
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xl font-bold tracking-tight whitespace-nowrap"
          >
            Recall X247
          </motion.h1>
        )}
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-1">
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
            <item.icon className={cn(
              "w-5 h-5 transition-transform duration-200 shrink-0",
              currentView === item.id ? "scale-110" : "group-hover:scale-110"
            )} />
            {!isCollapsed && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-medium whitespace-nowrap"
              >
                {item.label}
              </motion.span>
            )}
            {currentView === item.id && !isCollapsed && (
              <motion.div 
                layoutId="active-pill"
                className="ml-auto w-1.5 h-1.5 bg-white rounded-full"
              />
            )}
            {isCollapsed && currentView === item.id && (
              <div className="absolute right-2 w-1 h-6 bg-indigo-500 rounded-full" />
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        <div className={cn(
          "bg-slate-900/50 rounded-2xl border border-slate-800/50 transition-all duration-200 overflow-hidden",
          isCollapsed ? "p-2" : "p-4"
        )}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">PM</div>
            {!isCollapsed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium truncate">Prashant Maurya</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Pro Plan</p>
              </motion.div>
            )}
          </div>
          {!isCollapsed && (
            <button className="w-full py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors border-t border-slate-800/50 mt-2">
              Account Settings
            </button>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600 transition-all shadow-xl z-50"
      >
        <ChevronRight className={cn("w-4 h-4 transition-transform", !isCollapsed && "rotate-180")} />
      </button>
    </motion.div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<Memory[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

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
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Welcome back, Prashant</h2>
        <p className="text-slate-500 mt-1">Here's what's happening in your Second Brain today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Memories', value: stats?.total_memories || 0, icon: Brain, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Pending Tasks', value: stats?.pending_tasks || 0, icon: CheckSquare, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'AI Interactions', value: stats?.ai_interactions || 0, icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Knowledge Domains', value: stats?.knowledge_domains?.length || 0, icon: Globe, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label} 
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Recent Memories</h3>
              <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View all</button>
            </div>
            <div className="space-y-4">
              {recent.length > 0 ? recent.map((memory) => (
                <div key={memory.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex gap-4 hover:border-indigo-100 transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                    {memory.source_type === 'youtube' && <Youtube className="w-6 h-6 text-red-500" />}
                    {memory.source_type === 'web' && <Globe className="w-6 h-6 text-blue-500" />}
                    {memory.source_type === 'pdf' && <FileText className="w-6 h-6 text-orange-500" />}
                    {memory.source_type === 'note' && <StickyNote className="w-6 h-6 text-amber-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{memory.title}</h4>
                    <p className="text-sm text-slate-500 line-clamp-2 mt-1">{memory.summary}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-wider">{memory.domain}</span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(memory.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 self-center" />
                </div>
              )) : (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 border-dashed">
                  <p className="text-slate-400">No memories captured yet.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Recent AI Interactions</h3>
            <div className="bg-white rounded-3xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
              {logs.length > 0 ? logs.map((log, i) => (
                <div key={i} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-slate-800 line-clamp-1">{log.user_message}</p>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-4">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 italic">"{log.reply}"</p>
                </div>
              )) : (
                <div className="p-8 text-center text-slate-400">No interactions logged.</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900">Knowledge Domains</h3>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
            {stats?.knowledge_domains ? stats.knowledge_domains.map((domain: any) => (
              <div key={domain.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{domain.name}</span>
                  <span className="text-slate-400">{domain.value}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full" 
                    style={{ width: `${(domain.value / (stats.total_memories || 1)) * 100}%` }}
                  />
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-400 text-center py-8">Start capturing to see domain stats.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CaptureView = () => {
  const [activeTab, setActiveTab] = useState<'url' | 'text' | 'pdf'>('url');
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<Memory | null>(null);

  const handleCapture = async () => {
    if (!input && activeTab !== 'pdf') return;
    
    setIsProcessing(true);
    try {
      const res = await fetch('/capture', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          source_type: activeTab === 'url' ? (input.includes('youtube.com') || input.includes('youtu.be') ? 'youtube' : 'web') : (activeTab === 'pdf' ? 'pdf' : 'note'),
          url: activeTab === 'url' ? input : '',
          content: activeTab === 'text' ? input : '',
          preview: true
        })
      });
      
      if (res.status === 401) {
        const data = await res.json();
        throw new Error(data.error || "Unauthorized: Please check your API configuration or login state.");
      }
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPreview(data);
    } catch (err: any) {
      console.error("Capture Error:", err);
      alert(err.message || 'Failed to analyze content. Please try again.');
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
        alert('Saved to Vault!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header className="text-center">
        <h2 className="text-3xl font-bold text-slate-900">Capture Knowledge</h2>
        <p className="text-slate-500 mt-2">Add new sources to your Second Brain and let AI refine them.</p>
      </header>

      {!preview ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
          <div className="flex border-b border-slate-100">
            {[
              { id: 'url', label: 'URL', icon: Globe },
              { id: 'text', label: 'Text', icon: StickyNote },
              { id: 'pdf', label: 'PDF', icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-4 font-medium transition-colors",
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
                  placeholder="https://example.com/article or https://youtube.com/watch?v=..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            )}

            {activeTab === 'text' && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Paste your notes</label>
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Paste long text, notes, or snippets here..."
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                />
              </div>
            )}

            {activeTab === 'pdf' && (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-4 hover:border-indigo-300 transition-colors cursor-pointer group">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto group-hover:bg-indigo-50 transition-colors">
                  <FileText className="w-8 h-8 text-slate-400 group-hover:text-indigo-500" />
                </div>
                <div>
                  <p className="font-bold text-slate-700">Click to upload PDF</p>
                  <p className="text-sm text-slate-400">or drag and drop here</p>
                </div>
                <p className="text-xs text-slate-400">Max file size: 10MB</p>
              </div>
            )}

            <button 
              onClick={handleCapture}
              disabled={isProcessing || (!input && activeTab !== 'pdf')}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-900/20"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI is analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  Process with AI
                </>
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
          <div className="bg-slate-900 p-8 text-white flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-indigo-500 rounded text-[10px] font-bold uppercase tracking-widest">Refined by AI</span>
                <span className="px-2 py-1 bg-slate-700 rounded text-[10px] font-bold uppercase tracking-widest">{preview.domain}</span>
              </div>
              <h3 className="text-2xl font-bold">{preview.title}</h3>
            </div>
            <button onClick={() => setPreview(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8 space-y-8">
            <section className="space-y-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-500" />
                Summary
              </h4>
              <p className="text-slate-600 leading-relaxed">{preview.summary}</p>
            </section>

            <section className="space-y-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Key Insights
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {preview.key_points.map((point, i) => (
                  <li key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl text-sm text-slate-700 border border-slate-100">
                    <span className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                    {point}
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-500" />
                Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {preview.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">#{tag}</span>
                ))}
              </div>
            </section>

            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <button 
                onClick={() => setPreview(null)}
                className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Discard
              </button>
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

const VaultView = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  useEffect(() => {
    fetch('/memories').then(res => res.ok ? res.json() : []).then(data => {
      setMemories(data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  const filtered = memories.filter(m => 
    m.title.toLowerCase().includes(filter.toLowerCase()) || 
    m.tags.some(t => t.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Knowledge Vault</h2>
          <p className="text-slate-500 mt-1">Your entire Second Brain, organized and searchable.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search memories or tags..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-10 pr-4 py-2.5 w-full md:w-80 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.length > 0 ? filtered.map((memory) => (
            <div 
              key={memory.id} 
              onClick={() => setSelectedMemory(memory)}
              className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                  {memory.source_type === 'youtube' && <Youtube className="w-5 h-5 text-red-500" />}
                  {memory.source_type === 'web' && <Globe className="w-5 h-5 text-blue-500" />}
                  {memory.source_type === 'pdf' && <FileText className="w-5 h-5 text-orange-500" />}
                  {memory.source_type === 'note' && <StickyNote className="w-5 h-5 text-amber-500" />}
                </div>
                <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase tracking-wider">{memory.domain}</span>
              </div>
              
              <h4 className="font-bold text-slate-900 mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">{memory.title}</h4>
              <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-1">{memory.summary}</p>
              
              <div className="flex flex-wrap gap-1.5 mb-4">
                {memory.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-bold">#{tag}</span>
                ))}
                {memory.tags.length > 3 && <span className="text-[10px] text-slate-400 font-bold">+{memory.tags.length - 3} more</span>}
              </div>

              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(memory.created_at).toLocaleDateString()}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-all" />
              </div>
            </div>
          )) : (
            <div className="col-span-full py-20 text-center text-slate-400">
              No memories found matching your search.
            </div>
          )}
        </div>
      )}

      {/* Memory Detail Modal */}
      <AnimatePresence>
        {selectedMemory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMemory(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="bg-slate-900 p-8 text-white flex justify-between items-start shrink-0">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-indigo-500 rounded text-[10px] font-bold uppercase tracking-widest">{selectedMemory.source_type}</span>
                    <span className="px-2 py-1 bg-slate-700 rounded text-[10px] font-bold uppercase tracking-widest">{selectedMemory.domain}</span>
                  </div>
                  <h3 className="text-2xl font-bold">{selectedMemory.title}</h3>
                </div>
                <button onClick={() => setSelectedMemory(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto">
                <section className="space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-indigo-500" />
                    Summary
                  </h4>
                  <p className="text-slate-600 leading-relaxed">{selectedMemory.summary}</p>
                </section>

                <section className="space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Key Insights
                  </h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedMemory.key_points.map((point, i) => (
                      <li key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl text-sm text-slate-700 border border-slate-100">
                        <span className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-500" />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMemory.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">#{tag}</span>
                    ))}
                  </div>
                </section>

                {selectedMemory.source_url && (
                  <section className="pt-6 border-t border-slate-100">
                    <a 
                      href={selectedMemory.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Original Source
                    </a>
                  </section>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RecallView = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string, sources?: any[] }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);
    
    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, session_id: 'web_session' })
      });
      
      if (res.status === 401) {
        const data = await res.json();
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Authorization Error: ${data.error || "Please check your Gemini API configuration."}` 
        }]);
        return;
      }
      
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, sources: data.sources }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error while searching your brain." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col animate-in slide-in-from-bottom-4 duration-500">
      <header className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Recall Agent</h2>
        <p className="text-slate-500 mt-2">Ask questions and retrieve knowledge from your Second Brain.</p>
      </header>

      <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-slate-50/30">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <p className="font-bold text-slate-700">No messages yet</p>
                <p className="text-sm text-slate-500 max-w-xs">Ask me anything about your saved memories, or ask for a summary of a specific topic.</p>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={cn(
              "flex gap-4",
              msg.role === 'user' ? "flex-row-reverse" : ""
            )}>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                msg.role === 'user' ? "bg-indigo-600 text-white" : "bg-slate-900 text-white"
              )}>
                {msg.role === 'user' ? <Plus className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
              </div>
              <div className="space-y-2 max-w-[80%]">
                <div className={cn(
                  "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                  msg.role === 'user' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                )}>
                  {msg.content}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((source: any) => (
                      <div key={source.id} className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500 border border-slate-200 flex items-center gap-1">
                        <Brain className="w-3 h-3" />
                        {source.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4" />
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 flex gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="relative">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask your Second Brain..."
              className="w-full pl-4 pr-12 py-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-600/20"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TasksModule = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', due_date: '' });

  const fetchTasks = () => {
    setIsLoading(true);
    fetch('/tasks').then(res => res.ok ? res.json() : []).then(data => {
      setTasks(data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async () => {
    if (!newTask.title) return;
    try {
      await fetch('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      setShowNewTask(false);
      setNewTask({ title: '', priority: 'medium', due_date: '' });
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Tasks & Pipeline</h2>
          <p className="text-slate-500 mt-1">Manage your action items derived from captured knowledge.</p>
        </div>
        <button 
          onClick={() => setShowNewTask(true)}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95"
        >
          New Task
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {['todo', 'in-progress', 'completed'].map((status) => (
          <div key={status} className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest">{status.replace('-', ' ')}</h3>
              <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">
                {tasks.filter(t => t.status === status).length}
              </span>
            </div>
            <div className="space-y-3 min-h-[200px] p-2 bg-slate-100/50 rounded-3xl border border-slate-200/50 border-dashed">
              {tasks.filter(t => t.status === status).map(task => (
                <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                  <h4 className="font-bold text-slate-800 text-sm">{task.title}</h4>
                  <div className="flex items-center justify-between mt-3">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                      task.priority === 'high' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {task.priority}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{task.due_date || 'No date'}</span>
                  </div>
                </div>
              ))}
              {!isLoading && tasks.filter(t => t.status === status).length === 0 && (
                <div className="py-10 text-center text-slate-400 text-xs">No tasks</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New Task Modal */}
      <AnimatePresence>
        {showNewTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewTask(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
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
                    type="text" 
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    placeholder="What needs to be done?"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Priority</label>
                    <select 
                      value={newTask.priority}
                      onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Due Date</label>
                    <input 
                      type="date" 
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowNewTask(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateTask}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                >
                  Create Task
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CalendarModule = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '', duration_minutes: 60 });

  const fetchEvents = () => {
    setIsLoading(true);
    fetch('/schedule').then(res => res.ok ? res.json() : []).then(data => {
      setEvents(data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, []);

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
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Schedule</h2>
          <p className="text-slate-500 mt-1">Your upcoming study sessions and knowledge reviews.</p>
        </div>
        <button 
          onClick={() => setShowNewEvent(true)}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
        >
          New Event
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-xl p-8 min-h-[600px]">
          <div className="grid grid-cols-7 gap-4 mb-8">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">{day}</div>
            ))}
            {Array.from({ length: 31 }).map((_, i) => (
              <div key={i} className={cn(
                "aspect-square rounded-2xl border border-slate-50 flex flex-col p-2 hover:bg-slate-50 transition-colors cursor-pointer group",
                i + 1 === new Date().getDate() ? "bg-indigo-50 border-indigo-100" : ""
              )}>
                <span className={cn(
                  "text-xs font-bold",
                  i + 1 === new Date().getDate() ? "text-indigo-600" : "text-slate-400"
                )}>{i + 1}</span>
                <div className="mt-1 space-y-1">
                  {events.filter(e => new Date(e.date).getDate() === i + 1).map(e => (
                    <div key={e.id} className="w-full h-1 bg-indigo-500 rounded-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="font-bold text-slate-900">Upcoming Events</h3>
          <div className="space-y-4">
            {events.length > 0 ? events.map(event => (
              <div key={event.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-xs font-bold text-indigo-600 mb-1">{event.time}</p>
                <h4 className="font-bold text-slate-800 text-sm">{event.title}</h4>
                <p className="text-[10px] text-slate-400 mt-1">{event.duration_minutes} mins</p>
              </div>
            )) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400">No upcoming events</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Event Modal */}
      <AnimatePresence>
        {showNewEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewEvent(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <h3 className="text-xl font-bold text-slate-900">Schedule Event</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Event Title</label>
                  <input 
                    type="text" 
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    placeholder="Study session, review, etc."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date</label>
                    <input 
                      type="date" 
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time</label>
                    <input 
                      type="time" 
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({...newEvent, time: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowNewEvent(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateEvent}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                >
                  Schedule
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SettingsView = () => {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{status: 'success' | 'error', message: string} | null>(null);

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
      if (res.ok) {
        setTestResult({ status: 'success', message: data.message });
      } else {
        setTestResult({ status: 'error', message: data.detail || 'Test failed' });
      }
    } catch (err) {
      setTestResult({ status: 'error', message: 'Network error occurred' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">Settings & Status</h2>
        <p className="text-slate-500 mt-1">Manage your AI configuration and system preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            AI Configuration
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-slate-50">
              <span className="text-sm text-slate-500 font-medium">Gemini API Key</span>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-300" /> : (
                <span className={cn("text-xs font-bold px-2 py-1 rounded", settings?.gemini_api_key_set ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600")}>
                  {settings?.gemini_api_key_set ? 'CONFIGURED' : 'MISSING'}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-50">
              <span className="text-sm text-slate-500 font-medium">AI Model</span>
              <span className="text-xs font-bold text-slate-700">{settings?.gemini_model || 'Loading...'}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-slate-500 font-medium">GCP Project</span>
              <span className="text-xs font-bold text-slate-700">{settings?.gcp_project_id || 'Loading...'}</span>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-50">
            <button
              onClick={handleTestAI}
              disabled={isTesting || !settings?.gemini_api_key_set}
              className={cn(
                "w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
                settings?.gemini_api_key_set 
                  ? "bg-slate-900 text-white hover:bg-slate-800" 
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Test AI Connection
            </button>
            
            {testResult && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "mt-4 p-4 rounded-2xl text-xs flex gap-3",
                  testResult.status === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
                )}
              >
                {testResult.status === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <p>{testResult.message}</p>
              </motion.div>
            )}
          </div>

          {!settings?.gemini_api_key_set && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700 leading-relaxed">
                Gemini API Key is missing. Capture and Recall features will not work. Please set the <b>GEMINI_API_KEY</b> environment variable in the Settings menu.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500" />
            System Status
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-slate-50">
              <span className="text-sm text-slate-500 font-medium">Backend Server</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                HEALTHY
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-slate-50">
              <span className="text-sm text-slate-500 font-medium">Firestore Database</span>
              <span className="text-xs font-bold text-emerald-600">CONNECTED</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-slate-500 font-medium">App Version</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">v1.2.4-PRO</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [isReady, setIsReady] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
    // Small delay to ensure styles are loaded
    const timer = setTimeout(() => setIsReady(true), 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!isReady) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <p className="text-slate-400 font-medium animate-pulse">Initializing Second Brain...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          currentView={view} 
          setView={setView} 
          isCollapsed={isCollapsed} 
          setIsCollapsed={setIsCollapsed} 
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.div 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] z-[70] lg:hidden"
            >
              <Sidebar 
                currentView={view} 
                setView={(v) => { setView(v); setIsMobileMenuOpen(false); }} 
                isCollapsed={false} 
                setIsCollapsed={() => {}} 
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      <main className="flex-1 overflow-y-auto relative">
        {/* Top Header / Search Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <div className="space-y-1.5">
                <div className="w-5 h-0.5 bg-slate-600 rounded-full" />
                <div className="w-5 h-0.5 bg-slate-600 rounded-full" />
                <div className="w-5 h-0.5 bg-slate-600 rounded-full" />
              </div>
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
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all relative">
              <Clock className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white" />
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2" />
            <button 
              onClick={() => setView('capture')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Capture
            </button>
          </div>
        </header>

        <div className="p-8 lg:p-12 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'dashboard' && <Dashboard />}
              {view === 'capture' && <CaptureView />}
              {view === 'vault' && <VaultView />}
              {view === 'recall' && <RecallView />}
              {view === 'tasks' && <TasksModule />}
              {view === 'calendar' && <CalendarModule />}
              {view === 'settings' && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Command Palette Overlay */}
      <AnimatePresence>
        {showCommandPalette && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCommandPalette(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                <Search className="w-5 h-5 text-indigo-500" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Type a command or search..."
                  className="flex-1 text-lg outline-none placeholder:text-slate-400"
                />
                <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500">
                  ESC
                </div>
              </div>
              <div className="p-2 max-h-[60vh] overflow-y-auto">
                <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Actions</div>
                {[
                  { icon: Plus, label: 'Capture new memory', shortcut: 'N', action: () => setView('capture') },
                  { icon: Search, label: 'Ask Recall Agent', shortcut: 'Q', action: () => setView('recall') },
                  { icon: CheckSquare, label: 'Create new task', shortcut: 'T', action: () => setView('tasks') },
                  { icon: Brain, label: 'Open Knowledge Vault', shortcut: 'V', action: () => setView('vault') },
                ].map((item) => (
                  <button 
                    key={item.label}
                    onClick={() => { item.action(); setShowCommandPalette(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-slate-50 rounded-xl transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-slate-100 transition-all">
                      <item.icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                    </div>
                    <span className="flex-1 text-left text-sm font-medium text-slate-700">{item.label}</span>
                    <span className="text-[10px] font-bold text-slate-300 group-hover:text-slate-400">{item.shortcut}</span>
                  </button>
                ))}
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <p className="text-[10px] text-slate-400 font-medium">Tip: Use arrow keys to navigate</p>
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-indigo-300" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recall X247 AI</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
