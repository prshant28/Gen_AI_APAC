import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalIcon, Plus, Loader2, GraduationCap, X, Compass, Link as LinkIcon, Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CalendarModule = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [icsCopied, setIcsCopied] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '', duration_minutes: 60 });
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

  const icsUrl = `${window.location.origin}/calendar.ics`;
  const webcalUrl = icsUrl.replace(/^https?:/, 'webcal:');

  const copyIcs = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setIcsCopied(true);
      setTimeout(() => setIcsCopied(false), 2000);
    } catch {}
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
          <button onClick={() => navigate('/discover')} title="Find external articles & videos"
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Compass size={14} /> Discover
          </button>
          <button onClick={() => setShowSubscribe(true)} title="Subscribe in Google/Apple/Outlook"
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <LinkIcon size={14} /> Subscribe (ICS)
          </button>
          <button onClick={() => navigate('/plan')}
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
              <button onClick={() => navigate('/plan')}
                style={{ padding: '6px 14px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 8, color: 'var(--primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Generate study plan
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

      {/* Subscribe (ICS) Modal */}
      <AnimatePresence>
        {showSubscribe && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSubscribe(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ position: 'relative', width: '100%', maxWidth: 520, ...card, padding: '28px 26px', borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#06b6d4,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LinkIcon size={16} color="#fff" />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Subscribe to your Calendar</h3>
                </div>
                <button onClick={() => setShowSubscribe(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text-2)', display: 'flex', alignItems: 'center' }}>
                  <X size={16} />
                </button>
              </div>
              <p style={{ color: 'var(--text-3)', fontSize: 12.5, margin: '0 0 16px', lineHeight: 1.55 }}>
                Add this read-only feed to Google, Apple or Outlook to see your Recall events and open tasks alongside your other calendars. Updates automatically when your provider refreshes (usually every few hours).
              </p>

              <label style={labelStyle}>Subscription URL</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input readOnly value={icsUrl} onClick={e => (e.target as HTMLInputElement).select()}
                  style={{ ...inputStyle, fontSize: 12, fontFamily: 'monospace', flex: 1 }} />
                <button onClick={() => copyIcs(icsUrl)}
                  style={{ padding: '0 14px', background: icsCopied ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg,#06b6d4,#0891b2)', border: icsCopied ? '1px solid rgba(16,185,129,0.4)' : 'none', borderRadius: 10, color: icsCopied ? '#10b981' : '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                  {icsCopied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                <a href={webcalUrl}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-1)', fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'inherit' }}>
                  Open in Apple Calendar
                </a>
                <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icsUrl)}`} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-1)', fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'inherit' }}>
                  Add to Google Calendar
                </a>
              </div>

              <details style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.55 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>Manual setup instructions</summary>
                <ul style={{ margin: '8px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li><strong>Google:</strong> Other calendars → + → From URL → paste the link above.</li>
                  <li><strong>Apple:</strong> Calendar app → File → New Calendar Subscription → paste the link.</li>
                  <li><strong>Outlook:</strong> Add calendar → Subscribe from web → paste the link.</li>
                </ul>
              </details>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarModule;
