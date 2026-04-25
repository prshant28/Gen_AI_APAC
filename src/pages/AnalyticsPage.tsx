import React, { useState, useEffect } from 'react';
import { BarChart2 } from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Memory } from '../lib/types';

const AnalyticsView = () => {
  const [stats, setStats] = useState<any>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/stats').then(r => r.ok ? r.json() : null),
      fetch('/memories?limit=50').then(r => r.ok ? r.json() : []),
      fetch('/logs?limit=20').then(r => r.ok ? r.json() : []),
      fetch('/tasks?limit=50').then(r => r.ok ? r.json() : []),
    ]).then(([s, m, l, t]) => { if (s) setStats(s); setMemories(m); setLogs(l); setTasks(t); });
  }, []);

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, backdropFilter: 'blur(20px)' } as React.CSSProperties;
  const COLORS = ['#00d4ff', '#8b5cf6', '#f472b6', '#10b981', '#f59e0b'];
  const domains = stats?.knowledge_domains ?? [];

  const srcCounts = { youtube: 0, web: 0, pdf: 0, note: 0 };
  memories.forEach(m => { if (m.source_type in srcCounts) (srcCounts as any)[m.source_type]++; });
  const srcData = [
    { name: 'YouTube', value: srcCounts.youtube, color: '#ef4444' },
    { name: 'Web', value: srcCounts.web, color: '#00d4ff' },
    { name: 'PDF', value: srcCounts.pdf, color: '#f59e0b' },
    { name: 'Notes', value: srcCounts.note, color: '#10b981' },
  ].filter(s => s.value > 0);

  const tagFreq: Record<string, number> = {};
  memories.forEach(m => m.tags.forEach(t => { tagFreq[t] = (tagFreq[t] || 0) + 1; }));
  const topTags = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));

  const actMap: Record<string, number> = {};
  memories.forEach(m => {
    const d = new Date(m.created_at);
    if (!isNaN(d.getTime())) { const k = d.toLocaleDateString('en-US', { weekday: 'short' }); actMap[k] = (actMap[k] || 0) + 1; }
  });
  const actData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({ day: d, captures: actMap[d] || 0 }));

  const kpis = [
    { label: 'Total Memories', value: memories.length, sub: 'All time', color: '#00d4ff' },
    { label: 'Avg per Domain', value: domains.length > 0 ? (memories.length / domains.length).toFixed(1) : 0, sub: 'Memories/domain', color: '#8b5cf6' },
    { label: 'AI Sessions', value: logs.length, sub: 'Queries answered', color: '#f472b6' },
    { label: 'Tasks Created', value: tasks.length, sub: 'Total tasks', color: '#10b981' },
  ];

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 size={17} color="#10b981" />
          </div>
          <div>
            <h1 style={{ color: 'var(--text-1)', fontSize: 22, fontWeight: 700, margin: 0 }}>Analytics</h1>
            <p style={{ color: 'var(--text-3)', fontSize: 12, margin: 0 }}>Deep insights into your knowledge patterns</p>
          </div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 18 }}>
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            style={{ ...card, padding: '18px 20px', border: `1px solid ${k.color}25` }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: k.color, lineHeight: 1, marginBottom: 4 }}>{k.value}</div>
            <div style={{ color: '#d1d5db', fontSize: 13, fontWeight: 500 }}>{k.label}</div>
            <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>{k.sub}</div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ ...card, padding: '18px 20px' }}>
          <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Captures by Day</div>
          <div style={{ color: '#4b5563', fontSize: 11, marginBottom: 14 }}>Day-of-week distribution</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={actData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0d0d1a', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 11, color: '#e2e8f0' }} />
              <Bar dataKey="captures" fill="#00d4ff" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={{ ...card, padding: '18px 20px' }}>
          <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Source Distribution</div>
          <div style={{ color: '#4b5563', fontSize: 11, marginBottom: 12 }}>Where knowledge comes from</div>
          {srcData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {srcData.map(s => (
                <div key={s.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#9ca3af', fontSize: 12 }}>{s.name}</span>
                    <span style={{ color: s.color, fontSize: 11, fontWeight: 600 }}>{s.value} ({Math.round(s.value / memories.length * 100)}%)</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(s.value / memories.length) * 100}%` }} transition={{ duration: 0.7, delay: 0.5 }}
                      style={{ height: '100%', borderRadius: 4, background: s.color, boxShadow: `0 0 8px ${s.color}60` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p style={{ color: '#6b7280', fontSize: 12 }}>Capture memories to see distribution</p>}
        </motion.div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ ...card, padding: '18px 20px' }}>
          <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, marginBottom: 14 }}>Knowledge Domains</div>
          {domains.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={domains.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ background: '#0d0d1a', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8, fontSize: 11, color: '#e2e8f0' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {domains.slice(0, 8).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>No domain data yet</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} style={{ ...card, padding: '18px 20px' }}>
          <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, marginBottom: 14 }}>Top Tags</div>
          {topTags.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {topTags.map((t, i) => {
                const clr = COLORS[i % COLORS.length];
                const size = Math.max(11, Math.min(16, 10 + t.value * 1.5));
                return (
                  <div key={t.name} style={{ padding: '5px 11px', background: `${clr}12`, border: `1px solid ${clr}30`, borderRadius: 20, cursor: 'default' }}>
                    <span style={{ color: clr, fontSize: size, fontWeight: 500 }}>#{t.name}</span>
                    <span style={{ color: '#6b7280', fontSize: 9, marginLeft: 4 }}>×{t.value}</span>
                  </div>
                );
              })}
            </div>
          ) : <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>No tags yet — add tags when capturing</p>}
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsView;
