import React from 'react';
import { LayoutGrid, List as ListIcon, Rows2, Rows3 } from 'lucide-react';

export type ViewMode = 'grid' | 'list';
export type Density = 'comfortable' | 'compact';

interface Props {
  viewMode: ViewMode;
  onViewMode: (v: ViewMode) => void;
  density: Density;
  onDensity: (d: Density) => void;
  /** Hide density control when in list mode (since list has its own density). Default true. */
  hideDensityInList?: boolean;
  testIdPrefix?: string;
}

const ViewModeToggle: React.FC<Props> = ({
  viewMode, onViewMode, density, onDensity,
  hideDensityInList = true, testIdPrefix = '',
}) => {
  const segStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 2, padding: 3,
    background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9,
  };
  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 26, borderRadius: 6, border: 'none',
    background: 'transparent', cursor: 'pointer', color: 'var(--text-3)',
    transition: 'all 0.15s', fontFamily: 'inherit',
  };
  const buttonStyle = (on: boolean): React.CSSProperties => on
    ? { ...btnBase, background: 'var(--surface)', color: 'var(--primary)', boxShadow: 'var(--shadow-sm)' }
    : btnBase;

  const tid = (s: string) => testIdPrefix ? `${testIdPrefix}-${s}` : s;

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <div role="group" aria-label="View mode" style={segStyle}>
        <button
          data-testid={tid('view-grid')}
          title="Grid view"
          aria-label="Grid view"
          aria-pressed={viewMode === 'grid'}
          onClick={() => onViewMode('grid')}
          style={buttonStyle(viewMode === 'grid')}
        >
          <LayoutGrid size={14} strokeWidth={1.75} />
        </button>
        <button
          data-testid={tid('view-list')}
          title="List view"
          aria-label="List view"
          aria-pressed={viewMode === 'list'}
          onClick={() => onViewMode('list')}
          style={buttonStyle(viewMode === 'list')}
        >
          <ListIcon size={14} strokeWidth={1.75} />
        </button>
      </div>
      {(viewMode === 'grid' || !hideDensityInList) && (
        <div role="group" aria-label="Density" style={segStyle}>
          <button
            data-testid={tid('density-comfortable')}
            title="Comfortable"
            aria-label="Comfortable density"
            aria-pressed={density === 'comfortable'}
            onClick={() => onDensity('comfortable')}
            style={buttonStyle(density === 'comfortable')}
          >
            <Rows2 size={14} strokeWidth={1.75} />
          </button>
          <button
            data-testid={tid('density-compact')}
            title="Compact"
            aria-label="Compact density"
            aria-pressed={density === 'compact'}
            onClick={() => onDensity('compact')}
            style={buttonStyle(density === 'compact')}
          >
            <Rows3 size={14} strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ViewModeToggle;
