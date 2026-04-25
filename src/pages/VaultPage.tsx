import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Youtube, Globe, FileText, StickyNote, Download, Trash2, ExternalLink, FlipHorizontal, Brain, CheckCircle2, Tag, Clock, X, RotateCcw, ChevronLeft, ChevronRight, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getYouTubeId, YouTubeEmbed, YouTubeThumbnail } from '../lib/utils';
import type { Memory, Flashcard } from '../lib/types';

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
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
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
              <p className="text-slate-500 font-medium">Generating flashcards with Neural AI...</p>
            </div>
          ) : flashcards.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-sm text-slate-400 font-medium">
                <span>Card {currentIndex + 1} of {flashcards.length}</span>
                <div className="flex gap-1">
                  {flashcards.map((_, i) => (
                    <div key={i} className={cn('w-2 h-2 rounded-full', i === currentIndex ? 'bg-amber-500' : 'bg-slate-200')} />
                  ))}
                </div>
              </div>
              <motion.div key={`${currentIndex}-${flipped}`} initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.3 }}
                onClick={() => setFlipped(!flipped)}
                className={cn('min-h-[200px] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer border-2 transition-colors', flipped ? 'bg-indigo-50 border-indigo-200' : 'bg-amber-50 border-amber-200')}>
                <div className={cn('text-xs font-bold uppercase tracking-widest mb-4', flipped ? 'text-indigo-400' : 'text-amber-400')}>
                  {flipped ? 'Answer' : 'Question'}
                </div>
                <p className={cn('text-lg font-semibold leading-relaxed', flipped ? 'text-indigo-800' : 'text-amber-800')}>
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

const VaultView = () => {
  const navigate = useNavigate();
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
            <input type="text" placeholder="Search memories..." value={filter} onChange={(e) => setFilter(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-60 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>
          <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium">
            {domains.map(d => <option key={d} value={d}>{d || 'All Domains'}</option>)}
          </select>
          <a href="/export/vault" download="recall-x247-vault.md" title="Export entire vault as Markdown"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#9333ea)', color: 'white', fontSize: 13, fontWeight: 600, textDecoration: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.3)', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            <Download size={14} /> Export
          </a>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((memory) => (
            <motion.div key={memory.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-100 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden">
              {memory.source_type === 'youtube' && memory.source_url && getYouTubeId(memory.source_url) && (
                <YouTubeThumbnail url={memory.source_url} onClick={() => setSelectedMemory(memory)} />
              )}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors shrink-0">
                    {sourceIcon(memory.source_type)}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase">{memory.domain}</span>
                    <button onClick={(e) => { e.stopPropagation(); setFlashcardsMemory(memory); }} title="Generate Flashcards"
                      className="p-1.5 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition-colors text-slate-300">
                      <FlipHorizontal className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(memory.id); }} disabled={deletingId === memory.id} title="Delete memory"
                      className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-300">
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
                <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{new Date(memory.created_at).toLocaleDateString()}
                  </span>
                  <button onClick={() => setSelectedMemory(memory)} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700">View details →</button>
                </div>
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
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
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
              <div className="p-5 sm:p-8 space-y-6 overflow-y-auto">
                {selectedMemory.source_type === 'youtube' && selectedMemory.source_url && (
                  <YouTubeEmbed url={selectedMemory.source_url} />
                )}
                <section className="space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2"><Brain className="w-4 h-4 text-indigo-500" />Summary</h4>
                  <p className="text-slate-600 leading-relaxed">{selectedMemory.summary}</p>
                </section>
                <section className="space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Key Insights</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <section className="pt-4 border-t border-slate-100 flex flex-wrap gap-4">
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

export default VaultView;
