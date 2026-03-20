import { getCapacityStatus } from '../../services/maps';

const CapacityBadge = ({ current = 0, total = 1, showBar = true, size = 'md' }) => {
  const status = getCapacityStatus(current, total);
  const pct = Math.min(100, status.percent);

  const colorMap = {
    green:  { bar: '#10B981', bg: 'rgba(16,185,129,0.12)', text: '#34D399', border: 'rgba(16,185,129,0.3)' },
    yellow: { bar: '#F59E0B', bg: 'rgba(245,158,11,0.12)', text: '#FBBF24', border: 'rgba(245,158,11,0.3)' },
    orange: { bar: '#F97316', bg: 'rgba(249,115,22,0.12)', text: '#FB923C', border: 'rgba(249,115,22,0.3)' },
    red:    { bar: '#EF4444', bg: 'rgba(239,68,68,0.12)',  text: '#F87171', border: 'rgba(239,68,68,0.3)'  },
    gray:   { bar: '#6B7280', bg: 'rgba(107,114,128,0.12)', text: '#9CA3AF', border: 'rgba(107,114,128,0.3)' },
  };

  const c = colorMap[status.color] || colorMap.gray;
  const isSmall = size === 'sm';

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label + count */}
      <div className="flex items-center justify-between gap-3">
        <span
          className="inline-flex items-center gap-1.5 font-semibold rounded-full"
          style={{
            background: c.bg,
            color: c.text,
            border: `1px solid ${c.border}`,
            fontSize: isSmall ? '10px' : '11px',
            padding: isSmall ? '2px 8px' : '3px 10px',
          }}
        >
          <span style={{
            width: isSmall ? 5 : 6,
            height: isSmall ? 5 : 6,
            borderRadius: '50%',
            background: c.bar,
            display: 'inline-block',
            flexShrink: 0,
          }} />
          {status.label}
        </span>
        <span style={{ color: 'var(--text-3)', fontSize: isSmall ? '11px' : '12px' }}>
          {current}/{total}
        </span>
      </div>

      {/* Bar */}
      {showBar && (
        <div style={{
          width: '100%',
          height: isSmall ? 4 : 5,
          borderRadius: 99,
          background: 'var(--surface-4)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 99,
            background: c.bar,
            transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>
      )}
    </div>
  );
};

export default CapacityBadge;