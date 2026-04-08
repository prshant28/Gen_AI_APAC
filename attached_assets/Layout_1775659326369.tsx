import { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router';
import {
  LayoutDashboard, Plus, Bot, Clock, Settings,
  Brain, ChevronLeft, ChevronRight, Bell, Search, Zap, User, Home, Menu, X, Network, Layers, Shield, Library, LogOut
} from 'lucide-react';
import { NeuralBackground } from './NeuralBackground';
import { useWindowSize } from '../hooks/useWindowSize';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/app',           icon: Home,           label: 'Home',      color: '#00d4ff', desc: 'Home Dashboard' },
  { path: '/app/capture',   icon: Plus,           label: 'Capture',   color: '#8b5cf6', desc: 'Add Knowledge' },
  { path: '/app/captures',  icon: Library,        label: 'Library',   color: '#f472b6', desc: 'All Captures' },
  { path: '/app/assistant', icon: Bot,            label: 'AI Mind',   color: '#f472b6', desc: 'Neural Assistant' },
  { path: '/app/insights',  icon: LayoutDashboard, label: 'Insights', color: '#f472b6', desc: 'Knowledge Dashboard' },
  { path: '/app/graph',     icon: Network,        label: 'Graph',     color: '#10b981', desc: 'Knowledge Graph' },
  { path: '/app/workspace', icon: Layers,         label: 'Workspace', color: '#f59e0b', desc: 'Project Workspace' },
  { path: '/app/timeline',  icon: Clock,          label: 'Timeline',  color: '#10b981', desc: 'Memory Stream' },
  { path: '/app/privacy',   icon: Shield,         label: 'Privacy',   color: '#00d4ff', desc: 'Privacy & Safety' },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isMobile, isTablet } = useWindowSize();
  const { user, signOut } = useAuth();

  const displayName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  // On mobile: sidebar is an overlay. On tablet: collapsed by default. On desktop: full sidebar.
  const sidebarWidth = isMobile ? 260 : (collapsed || isTablet) ? 72 : 230;
  const mainMargin = isMobile ? 0 : (collapsed || isTablet) ? 72 : 230;
  const isCollapsed = isMobile ? false : (collapsed || isTablet);

  const closeMobileMenu = () => setMobileOpen(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  // Match active path (exact for /app, prefix for others)
  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app' || location.pathname === '/app/';
    return location.pathname.startsWith(path);
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div
        style={{
          padding: '20px 16px',
          borderBottom: '1px solid rgba(0, 212, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 0 25px rgba(0, 212, 255, 0.5)',
          }}
        >
          <Brain size={22} color="white" />
        </div>
        {(!isCollapsed || isMobile) && (
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                color: '#fff',
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: '0.3px',
                whiteSpace: 'nowrap',
              }}
            >
              RecallSense
            </div>
            <div
              style={{
                color: '#00d4ff',
                fontSize: 9,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                opacity: 0.8,
              }}
            >
              Neural OS v2.1
            </div>
          </div>
        )}
        {/* Close button for mobile */}
        {isMobile && (
          <button
            onClick={closeMobileMenu}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              padding: 4,
              display: 'flex',
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Status indicator */}
      {(!isCollapsed || isMobile) && (
        <div
          style={{
            margin: '12px 16px',
            padding: '8px 12px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
              flexShrink: 0,
            }}
          />
          <span style={{ color: '#10b981', fontSize: 12 }}>Neural Engine Active</span>
        </div>
      )}

      {/* Navigation */}
      <nav
        className="scroll-custom"
        style={{
          flex: 1,
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {NAV_ITEMS.map(({ path, icon: Icon, label, color }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              to={path}
              onClick={isMobile ? closeMobileMenu : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: isCollapsed ? '12px' : '11px 14px',
                borderRadius: 11,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                background: active ? `${color}18` : 'transparent',
                border: `1px solid ${active ? `${color}35` : 'transparent'}`,
                boxShadow: active ? `0 0 25px ${color}12, inset 0 0 15px ${color}05` : 'none',
                position: 'relative',
                overflow: 'hidden',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                flexShrink: 0,
              }}
            >
              {active && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '20%',
                    bottom: '20%',
                    width: 3,
                    background: color,
                    borderRadius: '0 4px 4px 0',
                    boxShadow: `0 0 12px ${color}`,
                  }}
                />
              )}
              <div style={{ flexShrink: 0 }}>
                <Icon
                  size={18}
                  color={active ? color : '#555577'}
                  style={{
                    filter: active ? `drop-shadow(0 0 6px ${color})` : 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
              </div>
              {(!isCollapsed || isMobile) && (
                <span
                  style={{
                    color: active ? '#e2e8f0' : '#6b7280',
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    whiteSpace: 'nowrap',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div
        style={{
          padding: '10px 10px 16px',
          borderTop: '1px solid rgba(0, 212, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          flexShrink: 0,
        }}
      >
        <Link
          to="/app/settings"
          onClick={isMobile ? closeMobileMenu : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: isCollapsed ? '12px' : '10px 14px',
            borderRadius: 10,
            textDecoration: 'none',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            background: location.pathname === '/app/settings' ? 'rgba(0,212,255,0.06)' : 'transparent'
          }}
        >
          <Settings size={17} color={location.pathname === '/app/settings' ? '#00d4ff' : '#555577'} />
          {(!isCollapsed || isMobile) && (
            <span style={{ color: location.pathname === '/app/settings' ? '#00d4ff' : '#555577', fontSize: 14, whiteSpace: 'nowrap' }}>Settings</span>
          )}
        </Link>

        {/* User */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: isCollapsed ? '8px' : '10px 14px',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
          }}
        >
          <div
            style={{
              width: 33,
              height: 33,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6, #f472b6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {avatarLetter}
          </div>
          {(!isCollapsed || isMobile) && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  color: '#d1d5db',
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {displayName}
              </div>
              <div style={{ color: '#4b5563', fontSize: 11, whiteSpace: 'nowrap' }}>Pro Neural Plan</div>
            </div>
          )}
          {/* Sign out */}
          {(!isCollapsed || isMobile) && (
            <button
              onClick={handleSignOut}
              title="Sign out"
              style={{
                background: 'rgba(239,68,68,0.07)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 7,
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.07)';
              }}
            >
              <LogOut size={12} color="#ef4444" />
            </button>
          )}
        </div>

        {/* Collapse toggle */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '7px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 8,
              cursor: 'pointer',
              color: '#555577',
              transition: 'all 0.2s ease',
            }}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        )}
      </div>
    </>
  );

  return (
    <div
      className="grid-bg"
      style={{
        background: '#05050f',
        minHeight: '100vh',
        display: 'flex',
        color: '#e2e8f0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated Blobs */}
      <div className="recall-blob-1" />
      <div className="recall-blob-2" />
      <div className="recall-blob-3" />

      {/* Neural Network Canvas */}
      <NeuralBackground />

      {/* Mobile Backdrop */}
      {isMobile && mobileOpen && (
        <div
          onClick={closeMobileMenu}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 49,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: isMobile ? 260 : sidebarWidth,
          transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'rgba(8, 8, 20, 0.96)',
          borderRight: '1px solid rgba(0, 212, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 50,
          backdropFilter: 'blur(30px)',
          flexShrink: 0,
          overflow: 'hidden',
          transform: isMobile
            ? mobileOpen ? 'translateX(0)' : 'translateX(-100%)'
            : 'translateX(0)',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <main
        style={{
          marginLeft: mainMargin,
          transition: 'margin-left 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          position: 'relative',
          zIndex: 1,
          minWidth: 0,
        }}
      >
        {/* Top Bar */}
        <header
          style={{
            height: 64,
            borderBottom: '1px solid rgba(0, 212, 255, 0.07)',
            background: 'rgba(5, 5, 15, 0.85)',
            backdropFilter: 'blur(30px)',
            display: 'flex',
            alignItems: 'center',
            padding: isMobile ? '0 14px' : '0 28px',
            gap: isMobile ? 10 : 16,
            position: 'sticky',
            top: 0,
            zIndex: 40,
            flexShrink: 0,
          }}
        >
          {/* Hamburger for mobile */}
          {isMobile && (
            <button
              onClick={() => setMobileOpen(true)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 8,
                cursor: 'pointer',
                color: '#9ca3af',
                padding: '7px',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <Menu size={18} />
            </button>
          )}

          {/* Mobile logo text */}
          {isMobile && (
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>
              RecallSense
            </span>
          )}

          {/* Search — hide on mobile */}
          {!isMobile && (
            <div
              style={{
                flex: 1,
                maxWidth: 420,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 14px',
                cursor: 'text',
                transition: 'all 0.2s ease',
              }}
            >
              <Search size={14} color="#4b5563" />
              <span style={{ color: '#4b5563', fontSize: 13 }}>Search memory bank...</span>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Quick Capture — hide label on tablet */}
          {!isMobile && (
            <Link
              to="/app/capture"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: isTablet ? '8px 12px' : '8px 16px',
                borderRadius: 10,
                background: 'linear-gradient(135deg,#00d4ff,#0099cc)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 0 20px rgba(0,212,255,0.3)',
              }}
            >
              <Zap size={14} />
              {!isTablet && 'Quick Capture'}
            </Link>
          )}

          {/* Neural score — hide on mobile */}
          {!isMobile && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(0, 212, 255, 0.06)',
                border: '1px solid rgba(0, 212, 255, 0.18)',
                borderRadius: 8,
                padding: isTablet ? '7px 10px' : '7px 14px',
              }}
            >
              <div className="glow-dot" style={{ background: '#00d4ff', color: '#00d4ff' }} />
              {!isTablet && (
                <span style={{ color: '#00d4ff', fontSize: 13 }}>Neural Score: 94%</span>
              )}
            </div>
          )}

          {/* Mobile search icon */}
          {isMobile && (
            <button
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 8,
                cursor: 'pointer',
                color: '#6b7280',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Search size={17} />
            </button>
          )}

          <button
            style={{
              position: 'relative',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 8,
              cursor: 'pointer',
              color: '#6b7280',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <Bell size={18} />
            <span
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#f472b6',
                boxShadow: '0 0 8px #f472b6',
              }}
            />
          </button>
        </header>

        {/* Page Content */}
        <div
          className="scroll-custom"
          style={{
            flex: 1,
            padding: isMobile ? 16 : 28,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}