import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Brain, Loader } from 'lucide-react';
import { NeuralBackground } from './NeuralBackground';

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#05050f',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 20, position: 'relative',
      }}>
        <NeuralBackground />
        <div className="recall-blob-1" />
        <div className="recall-blob-2" />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18,
            background: 'linear-gradient(135deg,#00d4ff,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(0,212,255,0.4)',
            animation: 'float-slow 3s ease-in-out infinite',
          }}>
            <Brain size={28} color="#fff" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Loader size={16} color="#00d4ff" style={{ animation: 'rotate-slow 1s linear infinite' }} />
            <span style={{ color: '#6b7280', fontSize: 14 }}>Initialising Neural OS...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}
