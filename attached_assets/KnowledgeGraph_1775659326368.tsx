import { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, Youtube, Globe, FileText, StickyNote } from 'lucide-react';
import { useWindowSize } from '../hooks/useWindowSize';

type NodeType = 'video' | 'article' | 'note' | 'paper';

interface GraphNode {
  id: string;
  label: string;
  shortLabel: string;
  type: NodeType;
  topic: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  connections: number;
}

interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

const TYPE_COLORS: Record<NodeType, string> = {
  video: '#ff4444',
  article: '#00d4ff',
  note: '#8b5cf6',
  paper: '#f59e0b',
};

const TYPE_LABELS: Record<NodeType, string> = {
  video: 'Video',
  article: 'Article',
  note: 'Note',
  paper: 'Research Paper',
};

const TOPIC_COLORS: Record<string, string> = {
  'AI & ML': '#00d4ff',
  'Philosophy': '#8b5cf6',
  'Physics': '#10b981',
  'AI Safety': '#f472b6',
  'Engineering': '#f59e0b',
};

const NODES_RAW: Array<{
  id: string; label: string; shortLabel: string;
  type: NodeType; topic: string; radius: number;
  cx: number; cy: number;
}> = [
  // ── AI & ML cluster (top-left) ──
  { id: 'n1',  label: 'Attention Is All You Need',     shortLabel: 'Attention',         type: 'paper',   topic: 'AI & ML',     radius: 20, cx: 0.28, cy: 0.34 },
  { id: 'n2',  label: 'Transformers Explained',        shortLabel: 'Transformers',      type: 'video',   topic: 'AI & ML',     radius: 16, cx: 0.18, cy: 0.25 },
  { id: 'n3',  label: 'State of GPT (Karpathy)',       shortLabel: 'State of GPT',      type: 'video',   topic: 'AI & ML',     radius: 17, cx: 0.34, cy: 0.21 },
  { id: 'n4',  label: 'Neural Scaling Laws',           shortLabel: 'Scaling Laws',      type: 'article', topic: 'AI & ML',     radius: 15, cx: 0.22, cy: 0.45 },
  { id: 'n5',  label: 'Geoffrey Hinton Lecture',       shortLabel: 'Hinton Lecture',    type: 'video',   topic: 'AI & ML',     radius: 15, cx: 0.12, cy: 0.35 },
  { id: 'n6',  label: 'GPT Architecture Notes',        shortLabel: 'GPT Notes',         type: 'note',    topic: 'AI & ML',     radius: 13, cx: 0.40, cy: 0.29 },
  { id: 'n7',  label: 'Anthropic Scaling Laws Blog',   shortLabel: 'Anthropic Scaling', type: 'article', topic: 'AI & ML',     radius: 14, cx: 0.15, cy: 0.53 },
  { id: 'n8',  label: 'Mixture of Experts Paper',      shortLabel: 'MoE Paper',         type: 'paper',   topic: 'AI & ML',     radius: 14, cx: 0.30, cy: 0.46 },
  // ── Philosophy cluster (top-right) ──
  { id: 'n9',  label: 'Consciousness & AI Podcast',    shortLabel: 'Consciousness AI',  type: 'video',   topic: 'Philosophy',  radius: 16, cx: 0.73, cy: 0.28 },
  { id: 'n10', label: 'Thoughts on Consciousness',     shortLabel: 'Consciousness Note',type: 'note',    topic: 'Philosophy',  radius: 14, cx: 0.79, cy: 0.18 },
  { id: 'n11', label: 'IIT & Global Workspace Theory', shortLabel: 'IIT Theory',        type: 'article', topic: 'Philosophy',  radius: 14, cx: 0.85, cy: 0.28 },
  { id: 'n12', label: 'Mind & Machine Synthesis',      shortLabel: 'Mind & Machine',    type: 'paper',   topic: 'Philosophy',  radius: 13, cx: 0.83, cy: 0.16 },
  { id: 'n13', label: 'AGI Alignment Notes',           shortLabel: 'Alignment Notes',   type: 'note',    topic: 'Philosophy',  radius: 14, cx: 0.63, cy: 0.38 },
  // ── Physics cluster (bottom-right) ──
  { id: 'n14', label: 'Arrow of Time (Sean Carroll)',  shortLabel: 'Arrow of Time',     type: 'video',   topic: 'Physics',     radius: 16, cx: 0.73, cy: 0.70 },
  { id: 'n15', label: 'Entropy & Thermodynamics',      shortLabel: 'Entropy',           type: 'paper',   topic: 'Physics',     radius: 14, cx: 0.83, cy: 0.62 },
  { id: 'n16', label: 'Quantum Computing Primer',      shortLabel: 'Quantum Comp.',     type: 'article', topic: 'Physics',     radius: 13, cx: 0.87, cy: 0.75 },
  { id: 'n17', label: 'Multiverse Cosmology',          shortLabel: 'Multiverse',        type: 'article', topic: 'Physics',     radius: 12, cx: 0.80, cy: 0.82 },
  { id: 'n18', label: 'Mindscape Podcast',             shortLabel: 'Mindscape',         type: 'video',   topic: 'Physics',     radius: 15, cx: 0.65, cy: 0.62 },
  // ── AI Safety / Engineering cluster (bottom-left) ──
  { id: 'n19', label: 'Constitutional AI (Anthropic)', shortLabel: 'Constitutional AI', type: 'paper',   topic: 'AI Safety',   radius: 17, cx: 0.28, cy: 0.72 },
  { id: 'n20', label: 'RLHF in Practice',              shortLabel: 'RLHF',              type: 'article', topic: 'AI Safety',   radius: 14, cx: 0.38, cy: 0.80 },
  { id: 'n21', label: 'AI Safety Research',            shortLabel: 'AI Safety',         type: 'article', topic: 'AI Safety',   radius: 15, cx: 0.16, cy: 0.73 },
  { id: 'n22', label: 'Multi-Agent Systems',           shortLabel: 'Multi-Agent',       type: 'video',   topic: 'Engineering', radius: 14, cx: 0.47, cy: 0.64 },
  { id: 'n23', label: 'Building AGI Systems',          shortLabel: 'Building AGI',      type: 'video',   topic: 'Engineering', radius: 15, cx: 0.53, cy: 0.76 },
  { id: 'n24', label: 'Deceptive Alignment Paper',     shortLabel: 'Deceptive Align.',  type: 'paper',   topic: 'AI Safety',   radius: 13, cx: 0.20, cy: 0.82 },
  { id: 'n25', label: 'ML Engineering Notes',          shortLabel: 'ML Eng Notes',      type: 'note',    topic: 'Engineering', radius: 13, cx: 0.49, cy: 0.54 },
];

const EDGES: GraphEdge[] = [
  { source: 'n2',  target: 'n1',  label: 'cites' },
  { source: 'n3',  target: 'n1',  label: 'references' },
  { source: 'n3',  target: 'n4',  label: 'discusses' },
  { source: 'n5',  target: 'n2',  label: 'explains' },
  { source: 'n6',  target: 'n1',  label: 'notes from' },
  { source: 'n7',  target: 'n4',  label: 'related to' },
  { source: 'n8',  target: 'n1',  label: 'extends' },
  { source: 'n8',  target: 'n7',  label: 'discusses' },
  { source: 'n9',  target: 'n10', label: 'explores' },
  { source: 'n9',  target: 'n11', label: 'covers' },
  { source: 'n10', target: 'n11', label: 'references' },
  { source: 'n10', target: 'n12', label: 'inspired by' },
  { source: 'n13', target: 'n9',  label: 'notes on' },
  { source: 'n13', target: 'n19', label: 'links to' },
  { source: 'n14', target: 'n18', label: 'from podcast' },
  { source: 'n15', target: 'n14', label: 'explains' },
  { source: 'n16', target: 'n15', label: 'relates' },
  { source: 'n17', target: 'n14', label: 'connects' },
  { source: 'n18', target: 'n9',  label: 'connects' },
  { source: 'n18', target: 'n10', label: 'discusses' },
  { source: 'n19', target: 'n20', label: 'requires' },
  { source: 'n19', target: 'n21', label: 'related' },
  { source: 'n20', target: 'n4',  label: 'uses' },
  { source: 'n21', target: 'n24', label: 'covers' },
  { source: 'n22', target: 'n23', label: 'part of' },
  { source: 'n23', target: 'n13', label: 'notes' },
  { source: 'n24', target: 'n13', label: 'connects' },
  { source: 'n25', target: 'n22', label: 'notes on' },
  { source: 'n3',  target: 'n19', label: 'mentions' },
  { source: 'n5',  target: 'n6',  label: 'sourced from' },
  { source: 'n1',  target: 'n8',  label: 'basis for' },
  { source: 'n11', target: 'n12', label: 'informs' },
  { source: 'n21', target: 'n13', label: 'notes' },
  { source: 'n25', target: 'n6',  label: 'related' },
  { source: 'n22', target: 'n19', label: 'applies' },
];

// ─── canvas helpers ───────────────────────────────────────────────────────────

function rgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = '#05050f';
  ctx.fillRect(0, 0, W, H);
  // Dot grid
  ctx.fillStyle = 'rgba(0,212,255,0.04)';
  const sp = 28;
  for (let x = sp; x < W; x += sp) {
    for (let y = sp; y < H; y += sp) {
      ctx.beginPath();
      ctx.arc(x, y, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawClusterBgs(
  ctx: CanvasRenderingContext2D,
  nodes: GraphNode[],
  time: number
) {
  const map: Record<string, { sx: number; sy: number; cnt: number; color: string }> = {};
  nodes.forEach(n => {
    const c = TOPIC_COLORS[n.topic] || '#00d4ff';
    if (!map[n.topic]) map[n.topic] = { sx: 0, sy: 0, cnt: 0, color: c };
    map[n.topic].sx += n.x;
    map[n.topic].sy += n.y;
    map[n.topic].cnt++;
  });

  Object.entries(map).forEach(([topic, c]) => {
    const cx = c.sx / c.cnt;
    const cy = c.sy / c.cnt;
    const breathe = 1 + Math.sin(time * 0.6) * 0.05;
    const R = 115 * breathe;

    // Blob fill
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, rgba(c.color, 0.07));
    grad.addColorStop(0.65, rgba(c.color, 0.025));
    grad.addColorStop(1, rgba(c.color, 0));
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Dashed ring
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.88, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(c.color, 0.1);
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.font = '10px Inter,sans-serif';
    ctx.fillStyle = rgba(c.color, 0.5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(topic.toUpperCase(), cx, cy - R * 0.84);
  });
}

function drawEdges(
  ctx: CanvasRenderingContext2D,
  nodes: GraphNode[],
  time: number,
  selectedId: string | null,
  hoveredId: string | null
) {
  const nm = new Map(nodes.map(n => [n.id, n]));

  EDGES.forEach((edge, i) => {
    const src = nm.get(edge.source);
    const tgt = nm.get(edge.target);
    if (!src || !tgt) return;

    const toSel = selectedId && (edge.source === selectedId || edge.target === selectedId);
    const toHov = hoveredId && !selectedId && (edge.source === hoveredId || edge.target === hoveredId);
    const active = toSel || toHov;

    const a = selectedId
      ? (toSel ? 0.85 : 0.04)
      : hoveredId
        ? (toHov ? 0.7 : 0.1)
        : 0.22;

    // Line
    const grad = ctx.createLinearGradient(src.x, src.y, tgt.x, tgt.y);
    grad.addColorStop(0, rgba(src.color, a));
    grad.addColorStop(1, rgba(tgt.color, a));
    ctx.beginPath();
    ctx.moveTo(src.x, src.y);
    ctx.lineTo(tgt.x, tgt.y);
    ctx.strokeStyle = grad;
    ctx.lineWidth = active ? 1.8 : 0.7;
    if (active) { ctx.shadowBlur = 8; ctx.shadowColor = src.color; }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Flowing particle
    if (a > 0.02) {
      const speed = active ? 0.45 : 0.2;
      const t = ((time * speed) + i * 0.38) % 1;
      const px = src.x + (tgt.x - src.x) * t;
      const py = src.y + (tgt.y - src.y) * t;
      ctx.beginPath();
      ctx.arc(px, py, active ? 2.8 : 1.3, 0, Math.PI * 2);
      ctx.fillStyle = rgba(src.color, Math.min(a * 2.2, 1));
      ctx.shadowBlur = active ? 12 : 5;
      ctx.shadowColor = src.color;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  });
}

function drawNodes(
  ctx: CanvasRenderingContext2D,
  nodes: GraphNode[],
  time: number,
  hoveredId: string | null,
  selectedId: string | null
) {
  // Build dimming set
  const highlight = new Set<string>();
  if (selectedId) {
    highlight.add(selectedId);
    EDGES.forEach(e => {
      if (e.source === selectedId) highlight.add(e.target);
      if (e.target === selectedId) highlight.add(e.source);
    });
  }

  nodes.forEach((node, idx) => {
    const isHov = node.id === hoveredId;
    const isSel = node.id === selectedId;
    const dimmed = !!(selectedId && !highlight.has(node.id));
    const pulse = 1 + Math.sin(time * 1.8 + idx * 0.65) * 0.05;
    const r = node.radius * (isSel ? 1.22 : isHov ? 1.15 : 1);
    const da = dimmed ? 0.2 : 1;

    // Outer halo
    const haloR = r * 2.6 * pulse;
    const halo = ctx.createRadialGradient(node.x, node.y, r * 0.5, node.x, node.y, haloR);
    halo.addColorStop(0, rgba(node.color, 0.22 * da));
    halo.addColorStop(0.55, rgba(node.color, 0.07 * da));
    halo.addColorStop(1, rgba(node.color, 0));
    ctx.beginPath();
    ctx.arc(node.x, node.y, haloR, 0, Math.PI * 2);
    ctx.fillStyle = halo;
    ctx.fill();

    // Active glow ring (selected)
    if (isSel && !dimmed) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(node.color, 0.5);
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 20;
      ctx.shadowColor = node.color;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Node body
    if (isHov || isSel) { ctx.shadowBlur = 30; ctx.shadowColor = node.color; }
    const body = ctx.createRadialGradient(
      node.x - r * 0.28, node.y - r * 0.28, 0,
      node.x, node.y, r
    );
    body.addColorStop(0, rgba(node.color, da));
    body.addColorStop(0.55, rgba(node.color, 0.85 * da));
    body.addColorStop(1, rgba(node.color, 0.45 * da));
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Border
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(node.color, (isHov || isSel ? 1.0 : 0.7) * da);
    ctx.lineWidth = isHov || isSel ? 2.5 : 1.5;
    ctx.stroke();

    // Dark inner for icon
    ctx.beginPath();
    ctx.arc(node.x, node.y, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(5,5,15,${0.65 * da})`;
    ctx.fill();

    // Type icon symbol
    ctx.globalAlpha = da;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.max(r * 0.58, 8)}px serif`;
    const icons: Record<NodeType, string> = { video: '▶', article: '◎', note: '✎', paper: '≡' };
    ctx.fillText(icons[node.type], node.x, node.y + 1);

    // Label
    const la = (isHov || isSel) ? 1 : 0.48;
    ctx.globalAlpha = da * la;
    ctx.font = `${isHov || isSel ? '600' : '400'} ${isHov || isSel ? 11.5 : 10}px Inter,sans-serif`;
    ctx.fillStyle = isHov || isSel ? '#e2e8f0' : '#9ca3af';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.fillText(node.shortLabel, node.x, node.y + r + 5);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KnowledgeGraph() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef      = useRef<number>(0);
  const nodesRef     = useRef<GraphNode[]>([]);
  const timeRef      = useRef(0);
  const frameRef     = useRef(0);
  const hovIdRef     = useRef<string | null>(null);
  const selIdRef     = useRef<string | null>(null);
  const dragIdRef    = useRef<string | null>(null);
  const dragOffRef   = useRef({ x: 0, y: 0 });
  const readyRef     = useRef(false);

  const [hovNode, setHovNode] = useState<GraphNode | null>(null);
  const [selNode, setSelNode] = useState<GraphNode | null>(null);
  const { isMobile, isTablet } = useWindowSize();

  // ── Init nodes ──────────────────────────────────────────────────────────────
  const initNodes = useCallback((W: number, H: number) => {
    const cc: Record<string, number> = {};
    EDGES.forEach(e => {
      cc[e.source] = (cc[e.source] || 0) + 1;
      cc[e.target] = (cc[e.target] || 0) + 1;
    });
    nodesRef.current = NODES_RAW.map(n => ({
      ...n,
      color: TYPE_COLORS[n.type],
      x: n.cx * W + (Math.random() - 0.5) * 90,
      y: n.cy * H + (Math.random() - 0.5) * 90,
      vx: 0,
      vy: 0,
      connections: cc[n.id] || 0,
      radius: n.radius + Math.min((cc[n.id] || 0) * 1.4, 9),
    }));
    frameRef.current = 0;
  }, []);

  // ── Physics ─────────────────────────────────────────────────────────────────
  const physics = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const nodes = nodesRef.current;
    const W = canvas.width, H = canvas.height;
    if (!nodes.length) return;

    const REP = 6500, SPK = 0.042, REST = 130, DAMP = 0.87, CG = 0.0013;
    const fx: number[] = nodes.map(() => 0);
    const fy: number[] = nodes.map(() => 0);
    const idxMap = new Map(nodes.map((n, i) => [n.id, i]));

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const d  = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f  = REP / (d * d + 250);
        fx[i] -= (dx / d) * f; fy[i] -= (dy / d) * f;
        fx[j] += (dx / d) * f; fy[j] += (dy / d) * f;
      }
    }

    EDGES.forEach(e => {
      const si = idxMap.get(e.source)!, ti = idxMap.get(e.target)!;
      if (si === undefined || ti === undefined) return;
      const dx = nodes[ti].x - nodes[si].x;
      const dy = nodes[ti].y - nodes[si].y;
      const d  = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const f  = SPK * (d - REST);
      fx[si] += (dx / d) * f; fy[si] += (dy / d) * f;
      fx[ti] -= (dx / d) * f; fy[ti] -= (dy / d) * f;
    });

    const cx = W / 2, cy = H / 2;
    nodes.forEach((n, i) => {
      fx[i] += (cx - n.x) * CG;
      fy[i] += (cy - n.y) * CG;
    });

    nodes.forEach((n, i) => {
      if (dragIdRef.current === n.id) return;
      n.vx = (n.vx + fx[i]) * DAMP;
      n.vy = (n.vy + fy[i]) * DAMP;
      const mg = n.radius + 18;
      n.x = Math.max(mg, Math.min(W - mg, n.x + n.vx));
      n.y = Math.max(mg, Math.min(H - mg, n.y + n.vy));
    });
  }, []);

  // ── Render loop ─────────────────────────────────────────────────────────────
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || canvas.width === 0 || !nodesRef.current.length) {
      animRef.current = requestAnimationFrame(animate);
      return;
    }

    timeRef.current += 0.016;
    if (frameRef.current < 290) { physics(); frameRef.current++; }

    const W = canvas.width, H = canvas.height;
    drawBackground(ctx, W, H);
    drawClusterBgs(ctx, nodesRef.current, timeRef.current);
    drawEdges(ctx, nodesRef.current, timeRef.current, selIdRef.current, hovIdRef.current);
    drawNodes(ctx, nodesRef.current, timeRef.current, hovIdRef.current, selIdRef.current);

    animRef.current = requestAnimationFrame(animate);
  }, [physics]);

  // ── Setup / resize ──────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;

    const setup = () => {
      const W = container.offsetWidth  || 800;
      const H = container.offsetHeight || 500;
      canvas.width  = W;
      canvas.height = H;
      if (!readyRef.current) { readyRef.current = true; initNodes(W, H); }
    };

    setup();
    const t = setTimeout(setup, 80);
    animRef.current = requestAnimationFrame(animate);

    const onResize = () => { setup(); frameRef.current = 0; };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [initNodes, animate]);

  // ── Mouse helpers ────────────────────────────────────────────────────────────
  const getXY = (e: React.MouseEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (c.width  / r.width),
      y: (e.clientY - r.top)  * (c.height / r.height),
    };
  };

  const hitNode = (x: number, y: number) =>
    [...nodesRef.current].reverse().find(n => Math.hypot(n.x - x, n.y - y) <= n.radius + 8) || null;

  const handleMove = (e: React.MouseEvent) => {
    const { x, y } = getXY(e);
    if (dragIdRef.current) {
      const dn = nodesRef.current.find(n => n.id === dragIdRef.current);
      if (dn && canvasRef.current) {
        const W = canvasRef.current.width, H = canvasRef.current.height;
        const mg = dn.radius + 18;
        dn.x = Math.max(mg, Math.min(W - mg, x + dragOffRef.current.x));
        dn.y = Math.max(mg, Math.min(H - mg, y + dragOffRef.current.y));
        dn.vx = 0; dn.vy = 0;
      }
      return;
    }
    const n = hitNode(x, y);
    hovIdRef.current = n?.id || null;
    setHovNode(n || null);
    if (canvasRef.current) canvasRef.current.style.cursor = n ? 'grab' : 'default';
  };

  const handleDown = (e: React.MouseEvent) => {
    const { x, y } = getXY(e);
    const n = hitNode(x, y);
    if (n) {
      dragIdRef.current = n.id;
      dragOffRef.current = { x: n.x - x, y: n.y - y };
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
    }
  };

  const handleUp = () => {
    dragIdRef.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  };

  const handleClick = (e: React.MouseEvent) => {
    if (dragIdRef.current) return;
    const { x, y } = getXY(e);
    const n = hitNode(x, y);
    const next = n && selIdRef.current !== n.id ? n.id : null;
    selIdRef.current = next;
    setSelNode(next ? n : null);
  };

  // Touch support
  const toMouse = (e: React.TouchEvent): React.MouseEvent => {
    const t = e.touches[0] || e.changedTouches[0];
    return { clientX: t.clientX, clientY: t.clientY } as React.MouseEvent;
  };

  // ── Graph queries ────────────────────────────────────────────────────────────
  const connectedNodes = (id: string) => {
    const ids = new Set<string>();
    EDGES.forEach(e => {
      if (e.source === id) ids.add(e.target);
      if (e.target === id) ids.add(e.source);
    });
    return nodesRef.current.filter(n => ids.has(n.id));
  };

  const nodeEdges = (id: string) => EDGES.filter(e => e.source === id || e.target === id);

  const reset = () => {
    const c = canvasRef.current, ct = containerRef.current;
    if (!c || !ct) return;
    c.width = ct.offsetWidth; c.height = ct.offsetHeight;
    initNodes(c.width, c.height);
    selIdRef.current = null; hovIdRef.current = null;
    setSelNode(null); setHovNode(null);
  };

  const ch = isMobile ? 420 : isTablet ? 510 : 570;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div className="fade-in-up">
        <div style={{
          display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: 12,
        }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: isMobile ? 22 : 26, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
              Knowledge Graph
            </h1>
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
              Neural network visualization · <span style={{ color: '#00d4ff' }}>{NODES_RAW.length} nodes</span> · <span style={{ color: '#8b5cf6' }}>{EDGES.length} connections</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="rs-btn rs-btn-ghost"
              style={{ padding: '8px 14px', fontSize: 13, gap: 6 }}
              onClick={reset}
            >
              <RefreshCw size={14} />
              {!isMobile && 'Randomize Layout'}
            </button>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Canvas */}
        <div
          ref={containerRef}
          style={{
            flex: 1, height: ch, position: 'relative',
            borderRadius: 16, overflow: 'hidden',
            border: '1px solid rgba(0,212,255,0.12)',
            boxShadow: '0 0 60px rgba(0,212,255,0.04), inset 0 0 60px rgba(0,0,0,0.3)',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
            onMouseMove={handleMove}
            onMouseDown={handleDown}
            onMouseUp={handleUp}
            onMouseLeave={handleUp}
            onClick={handleClick}
            onTouchStart={e => handleDown(toMouse(e))}
            onTouchMove={e => { e.preventDefault(); handleMove(toMouse(e)); }}
            onTouchEnd={e => { handleUp(); handleClick(toMouse(e)); }}
          />

          {/* Controls badge */}
          <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 6 }}>
            {['Click to select', 'Drag to move'].map(h => (
              <div key={h} style={{
                background: 'rgba(5,5,15,0.7)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 5, padding: '3px 8px', color: '#4b5563', fontSize: 10,
                backdropFilter: 'blur(10px)',
              }}>{h}</div>
            ))}
          </div>

          {/* Hover tooltip */}
          {hovNode && (
            <div style={{
              position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(5,5,20,0.93)', border: `1px solid ${hovNode.color}45`,
              borderRadius: 10, padding: '10px 16px', pointerEvents: 'none',
              backdropFilter: 'blur(20px)', display: 'flex', gap: 10, alignItems: 'center',
              whiteSpace: 'nowrap', boxShadow: `0 0 24px ${hovNode.color}20`,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', background: hovNode.color,
                boxShadow: `0 0 8px ${hovNode.color}`, flexShrink: 0,
              }} />
              <div>
                <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{hovNode.label}</div>
                <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>
                  {TYPE_LABELS[hovNode.type]} · {hovNode.topic} · {hovNode.connections} connections
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side panel — desktop only */}
        {!isMobile && (
          <div style={{ width: 264, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Legend */}
            <div className="rs-card" style={{ padding: 18 }}>
              <div style={{ color: '#6b7280', fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>
                Node Types
              </div>
              {(Object.entries(TYPE_LABELS) as [NodeType, string][]).map(([type, label]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', background: TYPE_COLORS[type],
                    boxShadow: `0 0 8px ${TYPE_COLORS[type]}`, flexShrink: 0,
                  }} />
                  {type === 'video'   && <Youtube   size={12} color={TYPE_COLORS[type]} style={{ flexShrink: 0 }} />}
                  {type === 'article' && <Globe     size={12} color={TYPE_COLORS[type]} style={{ flexShrink: 0 }} />}
                  {type === 'note'    && <StickyNote size={12} color={TYPE_COLORS[type]} style={{ flexShrink: 0 }} />}
                  {type === 'paper'   && <FileText  size={12} color={TYPE_COLORS[type]} style={{ flexShrink: 0 }} />}
                  <span style={{ color: '#9ca3af', fontSize: 13, flex: 1 }}>{label}</span>
                  <span style={{ color: '#4b5563', fontSize: 12 }}>
                    {NODES_RAW.filter(n => n.type === type).length}
                  </span>
                </div>
              ))}
            </div>

            {/* Clusters */}
            <div className="rs-card" style={{ padding: 18 }}>
              <div style={{ color: '#6b7280', fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>
                Knowledge Clusters
              </div>
              {Object.entries(TOPIC_COLORS).map(([topic, color]) => {
                const cnt = NODES_RAW.filter(n => n.topic === topic).length;
                if (!cnt) return null;
                return (
                  <div key={topic} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
                        <span style={{ color: '#d1d5db', fontSize: 12 }}>{topic}</span>
                      </div>
                      <span style={{ color, fontSize: 11 }}>{cnt} nodes</span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min((cnt / NODES_RAW.length) * 100 * 3.8, 100)}%`,
                        background: `linear-gradient(90deg,${color}80,${color})`,
                        borderRadius: 2, boxShadow: `0 0 6px ${color}60`,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected node / stats */}
            {selNode ? (
              <div className="rs-card" style={{
                padding: 18,
                border: `1px solid ${selNode.color}28`,
                boxShadow: `0 0 30px ${selNode.color}0e`,
              }}>
                {/* Node header */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: `${selNode.color}18`, border: `2px solid ${selNode.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 0 18px ${selNode.color}40`, flexShrink: 0,
                  }}>
                    {selNode.type === 'video'   && <Youtube    size={14} color={selNode.color} />}
                    {selNode.type === 'article' && <Globe      size={14} color={selNode.color} />}
                    {selNode.type === 'note'    && <StickyNote size={14} color={selNode.color} />}
                    {selNode.type === 'paper'   && <FileText   size={14} color={selNode.color} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: selNode.color, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {TYPE_LABELS[selNode.type]}
                    </div>
                    <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, marginTop: 2, lineHeight: 1.35 }}>
                      {selNode.label}
                    </div>
                  </div>
                </div>

                {/* Stats pills */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'Connections', value: selNode.connections, color: selNode.color },
                    { label: 'Cluster',     value: selNode.topic.split(' ')[0], color: '#9ca3af' },
                  ].map(s => (
                    <div key={s.label} style={{
                      flex: 1, background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${s.color}20`, borderRadius: 8,
                      padding: '8px', textAlign: 'center',
                    }}>
                      <div style={{ color: s.color, fontSize: 18, fontWeight: 700 }}>{s.value}</div>
                      <div style={{ color: '#6b7280', fontSize: 10, marginTop: 1 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Connected nodes */}
                <div style={{ color: '#6b7280', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>
                  Connected ({connectedNodes(selNode.id).length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }} className="scroll-custom">
                  {connectedNodes(selNode.id).map(n => (
                    <div
                      key={n.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 8px', background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        borderRadius: 7, cursor: 'pointer', transition: 'all 0.2s',
                      }}
                      onClick={() => { selIdRef.current = n.id; setSelNode({ ...n }); }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = `${n.color}30`}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.04)'}
                    >
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: n.color, boxShadow: `0 0 5px ${n.color}`, flexShrink: 0 }} />
                      <span style={{ color: '#d1d5db', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {n.shortLabel}
                      </span>
                      <span style={{ color: '#4b5563', fontSize: 10, flexShrink: 0 }}>{TYPE_LABELS[n.type]}</span>
                    </div>
                  ))}
                </div>

                {/* Relationships */}
                <div style={{ color: '#6b7280', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: 12, marginBottom: 8 }}>
                  Relationships
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {nodeEdges(selNode.id).slice(0, 6).map((e, i) => {
                    const otherId = e.source === selNode.id ? e.target : e.source;
                    const other   = nodesRef.current.find(n => n.id === otherId);
                    const arrow   = e.source === selNode.id ? '→' : '←';
                    return (
                      <div key={i} style={{ display: 'flex', gap: 6, fontSize: 11, color: '#6b7280' }}>
                        <span style={{ color: '#4b5563' }}>{e.label}</span>
                        <span>{arrow}</span>
                        <span style={{ color: other?.color || '#9ca3af' }}>{other?.shortLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rs-card" style={{ padding: 18 }}>
                <div style={{ color: '#6b7280', fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>
                  Graph Statistics
                </div>
                {[
                  { label: 'Total Nodes',     value: NODES_RAW.length, color: '#00d4ff' },
                  { label: 'Connections',     value: EDGES.length,     color: '#8b5cf6' },
                  { label: 'Clusters',        value: 5,                color: '#10b981' },
                  { label: 'Avg Links / Node',value: (EDGES.length * 2 / NODES_RAW.length).toFixed(1), color: '#f59e0b' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <span style={{ color: '#9ca3af', fontSize: 13 }}>{label}</span>
                    <span style={{ color, fontSize: 13, fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
                <p style={{ color: '#4b5563', fontSize: 11, marginTop: 14, lineHeight: 1.65 }}>
                  Nodes auto-arrange using a force-directed layout. Click to inspect, drag to reorganize.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile selected node info */}
      {isMobile && selNode && (
        <div className="rs-card" style={{ padding: 14, border: `1px solid ${selNode.color}28` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: selNode.color, boxShadow: `0 0 8px ${selNode.color}`, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{selNode.label}</div>
              <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>
                {TYPE_LABELS[selNode.type]} · {selNode.topic} · {selNode.connections} connections
              </div>
            </div>
            <button
              onClick={() => { selIdRef.current = null; setSelNode(null); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4, display: 'flex', flexShrink: 0 }}
            >✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
