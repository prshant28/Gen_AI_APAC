import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';

export interface TabDef {
  id: string;
  label: string;
  icon?: React.ElementType;
  render: () => React.ReactNode;
}

interface Props {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  tabs: TabDef[];
  paramKey?: string;
  defaultTab?: string;
  rightSlot?: React.ReactNode;
}

const TabbedPage: React.FC<Props> = ({
  icon: Icon, iconColor, iconBg, title, subtitle, tabs,
  paramKey = 'tab', defaultTab, rightSlot,
}) => {
  const [params, setParams] = useSearchParams();
  const initial = params.get(paramKey) || defaultTab || tabs[0]?.id;
  const active = tabs.find(t => t.id === initial)?.id || tabs[0]?.id;

  const setActive = (id: string) => {
    const next = new URLSearchParams(params);
    next.set(paramKey, id);
    setParams(next, { replace: true });
  };

  const current = tabs.find(t => t.id === active) || tabs[0];

  return (
    <div style={{ color: 'var(--text-1)', padding: '14px 0' }}>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '16px 18px',
          marginBottom: 14,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: 11,
                background: iconBg,
                border: `1px solid ${iconColor}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={19} color={iconColor} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.4px', color: 'var(--text-1)' }}>{title}</h1>
              <p style={{ color: 'var(--text-3)', fontSize: 12, margin: '2px 0 0' }}>{subtitle}</p>
            </div>
          </div>
          {rightSlot}
        </div>

        <div
          role="tablist"
          style={{
            display: 'flex', gap: 4, marginTop: 14, flexWrap: 'wrap',
            background: 'var(--surface-2)', borderRadius: 10, padding: 4,
            border: '1px solid var(--border)', width: 'fit-content', maxWidth: '100%',
          }}
        >
          {tabs.map(t => {
            const isActive = t.id === active;
            const TabIcon = t.icon;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(t.id)}
                style={{
                  padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: isActive ? 'var(--surface)' : 'transparent',
                  color: isActive ? iconColor : 'var(--text-3)',
                  fontSize: 12.5, fontWeight: isActive ? 700 : 600,
                  transition: 'all 0.18s',
                  boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 6,
                  whiteSpace: 'nowrap',
                }}
              >
                {TabIcon && <TabIcon size={13} />}
                {t.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      <div key={active}>
        {current?.render()}
      </div>
    </div>
  );
};

export default TabbedPage;
