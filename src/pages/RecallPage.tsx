import React, { useState, useRef, useEffect } from 'react';
import { Brain, Plus, Send } from 'lucide-react';
import { cn } from '../lib/utils';

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
        setMessages(prev => [...prev, { role: 'assistant', content: `Authorization Error: ${data.error || 'Check API configuration.'}` }]);
        return;
      }
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, sources: data.sources, agents: data.agents_called }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = [
    'What have I learned about AI recently?',
    'Summarize my saved notes on productivity',
    'What are the key points from my YouTube captures?',
    'Create a task to review my recent memories',
  ];

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-10rem)] flex flex-col animate-in slide-in-from-bottom-4 duration-500">
      <header className="text-center mb-6">
        <h2 className="text-3xl font-bold text-slate-900">Recall AI</h2>
        <p className="text-slate-500 mt-2">Powered by Neural AI — ask anything about your saved knowledge.</p>
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
                  <button key={s} onClick={() => setInput(s)}
                    className="p-3 bg-white rounded-xl border border-slate-200 text-sm text-left text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-all font-medium">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn('flex gap-4', msg.role === 'user' ? 'flex-row-reverse' : '')}>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm', msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gradient-to-br from-slate-800 to-indigo-900 text-white')}>
                {msg.role === 'user' ? <Plus className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
              </div>
              <div className="space-y-2 max-w-[80%]">
                <div className={cn('p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap', msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100')}>
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
            <button onClick={handleSend} disabled={!input.trim() || isTyping}
              className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 transition-all shadow-lg shadow-indigo-600/20 shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecallView;
