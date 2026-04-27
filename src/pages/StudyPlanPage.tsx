import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Loader2, CheckCircle2, CalendarPlus, ListChecks, Sparkles, RefreshCw, Save, Compass } from 'lucide-react';
import { motion } from 'motion/react';

interface PlanDay {
  day: number;
  date: string;
  title: string;
  activities: string[];
  duration_minutes: number;
  focus_area: string;
}

const StudyPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [topic, setTopic] = useState(params.get('topic') || '');
  const [days, setDays] = useState(7);
  const [startTime, setStartTime] = useState('18:00');
  const [plan, setPlan] = useState<PlanDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createEvents, setCreateEvents] = useState(true);
  const [createTasks, setCreateTasks] = useState(true);
  const [savedSummary, setSavedSummary] = useState<{ events: number; tasks: number } | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem('study-plan-draft');
    if (cached) {
      try {
        const d = JSON.parse(cached);
        if (d.plan) setPlan(d.plan);
        if (d.topic) setTopic(d.topic);
      } catch {}
    }
  }, []);

  const handleGenerate = async () => {
    setIsLoading(true);
    setSavedSummary(null);
    try {
      const res = await fetch('/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, days })
      });
      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
        localStorage.setItem('study-plan-draft', JSON.stringify({ topic, plan: data.plan }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!plan.length) return;
    setIsSaving(true);
    try {
      const res = await fetch('/study-plan/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, plan, create_events: createEvents, create_tasks: createTasks, start_time: startTime })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || data?.detail || `Save failed (${res.status})`;
        window.dispatchEvent(new CustomEvent('recall-toast', { detail: { msg, type: 'error' } }));
        return;
      }
      setSavedSummary({ events: data.events_created || 0, tasks: data.tasks_created || 0 });
      window.dispatchEvent(new CustomEvent('recall-toast', { detail: { msg: `Plan saved — ${data.events_created || 0} events, ${data.tasks_created || 0} tasks created`, type: 'success' } }));
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('recall-toast', { detail: { msg: 'Failed to save plan', type: 'error' } }));
    } finally {
      setIsSaving(false);
    }
  };

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-1)', fontSize: 13, outline: 'none', fontFamily: 'inherit' };
  const labelStyle: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', display: 'block', marginBottom: 5 };

  return (
    <div style={{ color: 'var(--text-1)', padding: '14px 0' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="page-header" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg,#6366f1,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
            <GraduationCap size={19} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>Study Plan Generator</h1>
            <p style={{ color: 'var(--text-3)', fontSize: 12, margin: '2px 0 0' }}>AI-crafted study schedule from your saved knowledge — auto-syncs to Calendar & Tasks</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate(`/discover${topic ? `?topic=${encodeURIComponent(topic)}` : ''}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-2)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Compass size={13} /> Find resources
          </button>
        </div>
      </motion.div>

      {/* Inputs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        style={{ ...card, padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) 110px 130px auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Focus topic (optional)</label>
            <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="e.g., Transformer architecture, RAG, calculus…"
              style={inputStyle}
              onKeyDown={e => { if (e.key === 'Enter') handleGenerate(); }} />
          </div>
          <div>
            <label style={labelStyle}>Days</label>
            <input type="number" value={days} onChange={e => setDays(Math.max(1, Math.min(30, parseInt(e.target.value) || 7)))}
              min={1} max={30} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Daily start time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle} />
          </div>
          <button onClick={handleGenerate} disabled={isLoading}
            style={{ padding: '10px 18px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: isLoading ? 'wait' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7, opacity: isLoading ? 0.8 : 1, boxShadow: '0 4px 14px rgba(99,102,241,0.35)', whiteSpace: 'nowrap' }}>
            {isLoading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</> : plan.length ? <><RefreshCw size={14} /> Regenerate</> : <><Sparkles size={14} /> Generate plan</>}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '10px 0 0' }}>
          Leave the topic empty to base the plan on your most recent saved memories.
        </p>
      </motion.div>

      {/* Plan output */}
      {plan.length > 0 && (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ ...card, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(124,58,237,0.06))', borderColor: 'rgba(99,102,241,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer', fontWeight: 600 }}>
                <input type="checkbox" checked={createEvents} onChange={e => setCreateEvents(e.target.checked)} />
                <CalendarPlus size={13} color="var(--primary)" /> Add to Calendar
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer', fontWeight: 600 }}>
                <input type="checkbox" checked={createTasks} onChange={e => setCreateTasks(e.target.checked)} />
                <ListChecks size={13} color="var(--primary)" /> Add as Tasks
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {savedSummary && (
                <span style={{ fontSize: 11.5, color: '#10b981', fontWeight: 700 }}>
                  ✓ {savedSummary.events} events · {savedSummary.tasks} tasks created
                </span>
              )}
              <button onClick={handleSave} disabled={isSaving || (!createEvents && !createTasks)}
                style={{ padding: '8px 16px', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 9, color: '#fff', fontSize: 12, fontWeight: 700, cursor: isSaving ? 'wait' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, opacity: (isSaving || (!createEvents && !createTasks)) ? 0.6 : 1, boxShadow: '0 3px 10px rgba(16,185,129,0.3)' }}>
                {isSaving ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={13} /> Save plan</>}
              </button>
            </div>
          </motion.div>

          <div style={{ display: 'grid', gap: 10 }}>
            {plan.map((day, i) => (
              <motion.div key={day.day} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.04 }}
                style={{ ...card, padding: '16px 20px', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Day {day.day} · {day.date}</span>
                    <h5 style={{ fontWeight: 700, fontSize: 15, margin: '3px 0 0', color: 'var(--text-1)' }}>{day.title}</h5>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{day.duration_minutes} min</div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{day.focus_area}</div>
                  </div>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {day.activities?.map((activity, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
                      <CheckCircle2 size={13} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{activity}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {plan.length === 0 && !isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          style={{ ...card, borderStyle: 'dashed', padding: '50px 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <GraduationCap size={26} color="#818cf8" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Generate your first study plan</h3>
          <p style={{ color: 'var(--text-3)', fontSize: 12.5, margin: 0 }}>
            Enter a topic above (or leave blank) and the AI will craft a {days}-day plan from your saved memories.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default StudyPlanPage;
