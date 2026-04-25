import React, { useState, useEffect } from 'react';
import { Calendar as CalIcon, Plus, Loader2, GraduationCap, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-1)', fontSize: 13, outline: 'none', fontFamily: 'inherit' };
  const labelStyle: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', display: 'block', marginBottom: 5 };

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div style={{ color: 'var(--text-1)' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CalIcon size={17} color="var(--primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>Schedule</h1>
            <p style={{ color: 'var(--text-3)', fontSize: 12, margin: '2px 0 0' }}>Manage study sessions and knowledge review events</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setShowStudyPlan(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 10, color: 'var(--primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
            <GraduationCap size={14} /> AI Study Plan
          </button>
          <button onClick={() => setShowNewEvent(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: 'linear-gradient(135deg,var(--primary),#4f46e5)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
            <Plus size={14} /> New Event
          </button>
        </div>
      </div>

      {/* Layout */}
      <div className="calendar-layout">
        {/* Calendar grid */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>{monthName}</h3>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>{daysInMonth} days</div>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 6 }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = day === today.getDate();
              const dayEvents = events.filter(e => new Date(e.date).getDate() === day);
              return (
                <div key={day} style={{
                  aspectRatio: '1', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '6px 2px 4px',
                  background: isToday ? 'var(--primary)' : 'transparent',
                  border: `1px solid ${isToday ? 'transparent' : 'transparent'}`,
                  cursor: 'default', transition: 'background 0.15s',
                }}
                  onMouseEnter={e => { if (!isToday) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { if (!isToday) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isToday ? '#fff' : 'var(--text-2)' }}>{day}</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 3, justifyContent: 'center' }}>
                    {dayEvents.slice(0, 3).map((_, ei) => (
                      <div key={ei} style={{ width: 5, height: 5, borderRadius: '50%', background: isToday ? 'rgba(255,255,255,0.6)' : 'var(--primary)' }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Today marker */}
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 8px rgba(99,102,241,0.6)' }} />
            <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>Today — {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
        </motion.div>

        {/* Upcoming Events sidebar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>Upcoming Events</h3>
            {events.length > 0 && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{events.length} total</span>}
          </div>

          {isLoading ? (
            <div className="loading-center">
              <Loader2 size={22} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : events.length > 0 ? events.slice(0, 8).map((event, idx) => (
            <motion.div key={event.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
              style={{ ...card, padding: '12px 14px', borderRadius: 12 }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--primary)', marginBottom: 3, margin: '0 0 4px' }}>{event.date} · {event.time}</p>
              <h4 style={{ fontWeight: 700, fontSize: 13, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</h4>
              <p style={{ fontSize: 10, color: 'var(--text-3)', margin: 0 }}>{event.duration_minutes} mins</p>
            </motion.div>
          )) : (
            <div className="empty-state" style={{ ...card, borderStyle: 'dashed', borderRadius: 12, padding: '36px 16px' }}>
              <CalIcon size={28} color="var(--text-3)" />
              <p style={{ color: 'var(--text-3)', fontSize: 13, margin: 0 }}>No upcoming events</p>
              <button onClick={() => setShowNewEvent(true)}
                style={{ padding: '6px 14px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 8, color: 'var(--primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Add first event
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* New Event Modal */}
      <AnimatePresence>
        {showNewEvent && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowNewEvent(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ position: 'relative', width: '100%', maxWidth: 420, ...card, padding: '28px 26px', borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Schedule Event</h3>
                <button onClick={() => setShowNewEvent(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text-2)', display: 'flex', alignItems: 'center' }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Event Title</label>
                  <input type="text" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Study session, review, etc." style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Date</label>
                    <input type="date" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Time</label>
                    <input type="time" value={newEvent.time} onChange={e => setNewEvent({ ...newEvent, time: e.target.value })} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Duration (minutes)</label>
                  <input type="number" value={newEvent.duration_minutes} onChange={e => setNewEvent({ ...newEvent, duration_minutes: parseInt(e.target.value) })} style={inputStyle} min="15" step="15" />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                <button onClick={() => setShowNewEvent(false)} style={{ flex: 1, padding: '11px 0', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={handleCreateEvent} style={{ flex: 1, padding: '11px 0', background: 'linear-gradient(135deg,var(--primary),#4f46e5)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>Schedule</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Study Plan Modal */}
      <AnimatePresence>
        {showStudyPlan && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowStudyPlan(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ position: 'relative', width: '100%', maxWidth: 560, ...card, borderRadius: 20, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
              {/* Modal header */}
              <div style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.65)', margin: '0 0 4px' }}>Neural AI Powered</p>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>7-Day Study Plan Generator</h3>
                </div>
                <button onClick={() => setShowStudyPlan(false)} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: 7, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Modal body */}
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {studyPlan.length === 0 ? (
                  <>
                    <div>
                      <label style={labelStyle}>Focus Topic (optional)</label>
                      <input type="text" value={studyPlanTopic} onChange={e => setStudyPlanTopic(e.target.value)}
                        placeholder="e.g., Machine Learning, Python, History…"
                        style={inputStyle} />
                      <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '6px 0 0' }}>Leave empty to base the plan on all your saved memories</p>
                    </div>
                    <button onClick={handleGeneratePlan} disabled={planLoading}
                      style={{ padding: '13px 0', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: 11, color: '#fff', fontSize: 14, fontWeight: 700, cursor: planLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: planLoading ? 0.7 : 1, boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
                      {planLoading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating Plan…</> : <><GraduationCap size={16} /> Generate 7-Day Study Plan</>}
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>Your Personalized Study Plan</h4>
                      <button onClick={() => setStudyPlan([])} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Generate New</button>
                    </div>
                    {studyPlan.map((day: any) => (
                      <div key={day.day} style={{ ...card, padding: '16px 18px', borderRadius: 12, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Day {day.day} · {day.date}</span>
                            <h5 style={{ fontWeight: 700, fontSize: 14, margin: '3px 0 0', color: 'var(--text-1)' }}>{day.title}</h5>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{day.duration_minutes} min</div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>{day.focus_area}</div>
                          </div>
                        </div>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {day.activities?.map((activity: string, i: number) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--text-2)' }}>
                              <CheckCircle2 size={13} color="var(--primary)" style={{ flexShrink: 0, marginTop: 1 }} />
                              {activity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </>
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
