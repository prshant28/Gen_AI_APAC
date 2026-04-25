import React, { useState, useEffect, useRef } from 'react';
import { Network } from 'lucide-react';
import { motion } from 'motion/react';
import type { Memory } from '../lib/types';

const KnowledgeGraphView = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [stats, setStats] = useState<any>(null);
  const nodesRef = useRef<any[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    Promise.all([
      fetch('/memories?limit=30').then(r => r.ok ? r.json() : []),
      fetch('/stats').then(r => r.ok ? r.json() : null),
    ]).then(([m, s]) => { setMemories(m); setStats(s); });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || memories.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.offsetWidth; const H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;

    const COLORS = ['#00d4ff', '#8b5cf6', '#f472b6', '#10b981', '#f59e0b', '#ef4444'];
    const domains = [...new Set(memories.map(m => m.domain || 'General'))];

    const nodes: any[] = [{ id: 'center', label: 'Recall X247', x: W / 2, y: H / 2, r: 28, color: '#00d4ff', type: 'center', vx: 0, vy: 0, fixed: true }];

    domains.forEach((d, i) => {
      const angle = (i / domains.length) * Math.PI * 2 - Math.PI / 2;
      const dist = Math.min(W, H) * 0.28;
      nodes.push({ id: `domain:${d}`, label: d, x: W / 2 + Math.cos(angle) * dist, y: H / 2 + Math.sin(angle) * dist, r: 18, color: COLORS[i % COLORS.length], type: 'domain', vx: 0, vy: 0 });
    });

    memories.slice(0, 20).forEach((m, i) => {
      const domIdx = domains.indexOf(m.domain || 'General');
      const parent = nodes.find(n => n.id === `domain:${m.domain || 'General'}`);
      const angle = (i / memories.slice(0, 20).length) * Math.PI * 2;
      const dist = 60;
      const px = parent ? parent.x : W / 2;
      const py = parent ? parent.y : H / 2;
      nodes.push({ id: `mem:${m.id}`, label: m.title.slice(0, 18), x: px + Math.cos(angle) * dist + (Math.random() - 0.5) * 20, y: py + Math.sin(angle) * dist + (Math.random() - 0.5) * 20, r: 8, color: COLORS[domIdx % COLORS.length], type: 'memory', domainId: `domain:${m.domain || 'General'}`, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5 });
    });

    nodesRef.current = nodes;
    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      frame++;

      nodes.forEach(n => {
        if (n.fixed) return;
        const parent = n.domainId ? nodes.find(p => p.id === n.domainId) : nodes[0];
        if (parent) {
          const dx = parent.x - n.x; const dy = parent.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const target = n.type === 'domain' ? Math.min(W, H) * 0.28 : 70;
          const force = (dist - target) * 0.002;
          n.vx += dx / dist * force; n.vy += dy / dist * force;
        }
        nodes.forEach(o => {
          if (o.id === n.id) return;
          const dx = n.x - o.x; const dy = n.y - o.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 60 && dist > 0) { n.vx += dx / dist * 0.3; n.vy += dy / dist * 0.3; }
        });
        n.vx *= 0.85; n.vy *= 0.85;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(n.r + 10, Math.min(W - n.r - 10, n.x));
        n.y = Math.max(n.r + 10, Math.min(H - n.r - 10, n.y));
      });

      nodes.forEach(n => {
        if (n.type === 'center') return;
        const parent = n.domainId ? nodes.find(p => p.id === n.domainId) : nodes[0];
        if (!parent) return;
        ctx.beginPath();
        ctx.strokeStyle = n.type === 'domain' ? `${n.color}50` : `${n.color}25`;
        ctx.lineWidth = n.type === 'domain' ? 1.5 : 0.8;
        ctx.moveTo(parent.x, parent.y);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();
      });

      nodes.forEach(n => {
        const pulse = n.type === 'center' ? Math.sin(frame * 0.04) * 3 + n.r : n.r;
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, pulse * 2.5);
        grad.addColorStop(0, `${n.color}35`);
        grad.addColorStop(1, 'transparent');
        ctx.beginPath(); ctx.arc(n.x, n.y, pulse * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grad; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, pulse, 0, Math.PI * 2);
        ctx.fillStyle = `${n.color}25`; ctx.fill();
        ctx.strokeStyle = n.color; ctx.lineWidth = n.type === 'center' ? 2 : 1.5;
        ctx.stroke();
        if (n.type !== 'memory' || n.r > 6) {
          ctx.fillStyle = n.type === 'center' ? '#00d4ff' : '#9ca3af';
          ctx.font = `${n.type === 'center' ? '700 11px' : '500 9px'} 'Poppins', sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(n.label, n.x, n.y + pulse + 12);
        }
        if (n.type === 'center') {
          ctx.fillStyle = '#ffffff';
          ctx.font = "600 9px 'Poppins', sans-serif";
          ctx.textAlign = 'center';
          ctx.fillText(n.label, n.x, n.y + 4);
        }
      });

      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [memories]);

  const domains = stats?.knowledge_domains ?? [];
  const COLORS = ['#00d4ff', '#8b5cf6', '#f472b6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Network size={17} color="#8b5cf6" />
          </div>
          <div>
            <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, margin: 0 }}>Mind Graph</h1>
            <p style={{ color: '#4b5563', fontSize: 12, margin: 0 }}>Visual map of your knowledge connections</p>
          </div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16 }}>
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 16, overflow: 'hidden', height: 520, position: 'relative' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
          {memories.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Network size={40} color="#4b5563" />
              <p style={{ color: '#6b7280', fontSize: 13 }}>No memories to graph yet</p>
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 14, left: 14, display: 'flex', gap: 6 }}>
            {memories.length > 0 && (
              <div style={{ padding: '5px 10px', background: 'rgba(5,5,15,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#4b5563', fontSize: 10 }}>
                {memories.length} memories · {[...new Set(memories.map(m => m.domain))].length} domains
              </div>
            )}
          </div>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Domain Nodes</div>
            {domains.length > 0 ? domains.map((d: any, i: number) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], boxShadow: `0 0 6px ${COLORS[i % COLORS.length]}`, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-2)', fontSize: 12, flex: 1 }}>{d.name}</span>
                <span style={{ color: COLORS[i % COLORS.length], fontSize: 11, fontWeight: 600 }}>{d.value}</span>
              </div>
            )) : <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>Capture memories to see graph</p>}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Legend</div>
            {[
              { label: 'Central Hub', color: '#00d4ff', size: 12 },
              { label: 'Domain Node', color: '#8b5cf6', size: 9 },
              { label: 'Memory Node', color: '#6b7280', size: 6 },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: l.size, height: l.size, borderRadius: '50%', background: l.color, boxShadow: `0 0 6px ${l.color}80`, flexShrink: 0 }} />
                <span style={{ color: '#6b7280', fontSize: 11 }}>{l.label}</span>
              </div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Stats</div>
            {[
              { label: 'Total Nodes', value: memories.length + ([...new Set(memories.map(m => m.domain))].length || 0) + 1 },
              { label: 'Total Edges', value: memories.length + ([...new Set(memories.map(m => m.domain))].length || 0) },
              { label: 'Domains', value: [...new Set(memories.map(m => m.domain))].length || 0 },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#4b5563', fontSize: 11 }}>{s.label}</span>
                <span style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 600 }}>{s.value}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraphView;
