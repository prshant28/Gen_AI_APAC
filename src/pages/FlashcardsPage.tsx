import React, { useState, useEffect } from 'react';
import { FlipHorizontal, Loader2, Award, X, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
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
        <p className="text-slate-500 mt-1">Select any memory to generate interactive flashcards powered by Neural AI.</p>
      </header>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4">
        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
          <FlipHorizontal className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-amber-900">How it works</h3>
          <p className="text-sm text-amber-700 mt-1">Neural AI generates 5 Q&A flashcards from any saved memory. Click on a memory card below to start studying. Flip each card to reveal the answer.</p>
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
            <motion.button key={memory.id} whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} onClick={() => setSelectedMemory(memory)}
              className="bg-white rounded-3xl border border-slate-100 p-6 text-left flex flex-col gap-4 hover:shadow-xl hover:border-amber-200 transition-all duration-300 group">
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

export default FlashcardsView;
