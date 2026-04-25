import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Loader2, GraduationCap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

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
      await fetch('/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newEvent) });
      setShowNewEvent(false);
      setNewEvent({ title: '', date: '', time: '', duration_minutes: 60 });
      fetchEvents();
    } catch (err) { console.error(err); }
  };

  const handleGeneratePlan = async () => {
    setPlanLoading(true);
    try {
      const res = await fetch('/study-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: studyPlanTopic, days: 7 }) });
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
          <button onClick={() => setShowStudyPlan(true)}
            className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-100 transition-all flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />AI Study Plan
          </button>
          <button onClick={() => setShowNewEvent(true)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2">
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
                <div key={day} className={cn('aspect-square rounded-xl flex flex-col p-1.5 transition-colors cursor-default text-center', isToday ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50')}>
                  <span className={cn('text-xs font-bold', isToday ? 'text-white' : 'text-slate-500')}>{day}</span>
                  <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                    {dayEvents.slice(0, 3).map((_, ei) => (
                      <div key={ei} className={cn('w-1.5 h-1.5 rounded-full', isToday ? 'bg-white/60' : 'bg-indigo-500')} />
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

      <AnimatePresence>
        {showStudyPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowStudyPlan(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex justify-between items-center shrink-0">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">Neural AI Powered</p>
                  <h3 className="text-xl font-bold mt-1">7-Day Study Plan Generator</h3>
                </div>
                <button onClick={() => setShowStudyPlan(false)} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {studyPlan.length === 0 ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Focus Topic (optional)</label>
                      <input type="text" value={studyPlanTopic} onChange={(e) => setStudyPlanTopic(e.target.value)}
                        placeholder="e.g., Machine Learning, Python, History..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                      <p className="text-xs text-slate-400">Leave empty to base the plan on all your saved memories</p>
                    </div>
                    <button onClick={handleGeneratePlan} disabled={planLoading}
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50">
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

export default CalendarModule;
