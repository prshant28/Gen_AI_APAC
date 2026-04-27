import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Brain, Sparkles, Tag, Calendar as CalendarIcon, Globe, ArrowLeft, AlertTriangle, Hexagon, Link2 } from 'lucide-react';

interface SharedMemory {
  id: string;
  title: string;
  summary: string;
  key_points: string[];
  tags: string[];
  domain: string;
  source_type: string;
  source_url: string;
  created_at: string;
  shared_at: string;
}

const SharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [memory, setMemory] = useState<SharedMemory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`/share/${token}`).then(async r => {
      if (!r.ok) {
        setError(r.status === 404 ? 'This link has expired or no longer exists.' : 'Could not load shared memory.');
        setLoading(false);
        return;
      }
      const data = await r.json();
      setMemory(data);
      setLoading(false);
    }).catch(() => { setError('Network error'); setLoading(false); });
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text-1)', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Top bar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, padding: '14px 24px', background: 'var(--surface)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text-1)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, var(--primary) 0%, #818cf8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Hexagon size={16} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.4px' }}>Recall <span style={{ color: 'var(--primary)' }}>X247</span></span>
        </Link>
        <Link to="/login" style={{ padding: '7px 14px', background: 'var(--primary)', borderRadius: 9, color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 14px var(--primary-bg)' }}>
          Get Recall X247
        </Link>
      </header>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-3)' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite', margin: '0 auto 14px' }} />
            <p style={{ fontSize: 13 }}>Loading shared memory…</p>
          </div>
        ) : error ? (
          <div style={{ padding: '50px 30px', textAlign: 'center', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16 }}>
            <AlertTriangle size={36} color="#ef4444" style={{ margin: '0 auto 14px' }} />
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: 'var(--text-1)' }}>Memory not found</h2>
            <p style={{ margin: '0 0 20px', color: 'var(--text-3)', fontSize: 13 }}>{error}</p>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text-1)', fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>
              <ArrowLeft size={12} /> Back to home
            </Link>
          </div>
        ) : memory && (
          <>
            {/* Hero */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 20, marginBottom: 16 }}>
                <Sparkles size={11} color="var(--primary)" />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.5px' }}>SHARED MEMORY · PUBLIC VIEW</span>
              </div>
              <h1 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: 'var(--text-1)', margin: '0 0 14px', lineHeight: 1.15, letterSpacing: '-0.6px' }}>
                {memory.title}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: 'var(--text-3)', fontSize: 12.5, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CalendarIcon size={12} /> {new Date(memory.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                {memory.domain && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Globe size={12} /> {memory.domain}</span>}
                <span style={{ padding: '2px 9px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-2)' }}>{memory.source_type}</span>
              </div>
              {memory.source_url && (
                <a href={memory.source_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, fontSize: 11.5, color: 'var(--primary)', textDecoration: 'none' }}>
                  <Link2 size={11} /> {memory.source_url.slice(0, 80)}{memory.source_url.length > 80 ? '…' : ''}
                </a>
              )}
            </div>

            {/* Summary */}
            <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', marginBottom: 18 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <Brain size={14} color="var(--primary)" /> AI Summary
              </h2>
              <p style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.75, margin: 0 }}>{memory.summary}</p>
            </section>

            {/* Key insights */}
            {memory.key_points?.length > 0 && (
              <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', marginBottom: 18 }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <Sparkles size={14} color="var(--primary)" /> Key Insights
                </h2>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {memory.key_points.map((pt, i) => (
                    <li key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 11, border: '1px solid var(--border)' }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800, color: 'var(--primary)' }}>{i + 1}</span>
                      <span style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.65 }}>{pt}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Tags */}
            {memory.tags?.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px', fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <Tag size={12} /> Tags
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {memory.tags.map(t => (
                    <span key={t} style={{ padding: '4px 11px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 11, color: 'var(--primary)', fontSize: 11.5, fontWeight: 700 }}>#{t}</span>
                  ))}
                </div>
              </section>
            )}

            {/* CTA */}
            <div style={{ marginTop: 40, padding: '24px 28px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 16, textAlign: 'center' }}>
              <Brain size={28} color="var(--primary)" style={{ margin: '0 auto 8px' }} />
              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>Build your own second brain</h3>
              <p style={{ margin: '0 0 14px', color: 'var(--text-2)', fontSize: 13 }}>Capture, summarise, and recall everything that matters — with AI agents that remember for you.</p>
              <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: 'var(--primary)', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 16px var(--primary-bg)' }}>
                Try Recall X247 free
              </Link>
            </div>
          </>
        )}
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default SharePage;
