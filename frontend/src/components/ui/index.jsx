// ── LoadingScreen ────────────────────────────────────────
export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg-base)' }}>
      <div className="flex flex-col items-center gap-5">
        {/* Logo */}
        <div className="relative">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center glow-violet"
            style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%)' }}>
            <BusLogo size={32} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full dot-green" />
        </div>
        <div className="loader"><span /><span /><span /></div>
      </div>
    </div>
  );
}

function BusLogo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="7" width="18" height="12" rx="3" fill="white"/>
      <rect x="5" y="3" width="14" height="6" rx="2" fill="rgba(255,255,255,0.75)"/>
      <rect x="4" y="10" width="4" height="3" rx="1" fill="rgba(124,58,237,0.5)"/>
      <rect x="10" y="10" width="4" height="3" rx="1" fill="rgba(124,58,237,0.5)"/>
      <rect x="16" y="10" width="3" height="3" rx="1" fill="rgba(124,58,237,0.5)"/>
      <circle cx="7"  cy="20" r="2" fill="#08050F" stroke="white" strokeWidth="1"/>
      <circle cx="17" cy="20" r="2" fill="#08050F" stroke="white" strokeWidth="1"/>
    </svg>
  );
}

// ── CapacityBadge ────────────────────────────────────────
export function CapacityBadge({ current = 0, total = 30, size = 'md' }) {
  const pct = Math.min(current / (total || 1), 1);
  const color = pct >= 1 ? '#EF4444' : pct >= 0.8 ? '#F97316' : pct >= 0.5 ? '#F59E0B' : '#10B981';
  const label = pct >= 1 ? 'Full' : pct >= 0.8 ? 'Nearly full' : pct >= 0.5 ? 'Filling up' : 'Available';

  if (size === 'sm') return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>{current}/{total} seats</span>
        <span className="text-xs font-medium" style={{ color }}>{label}</span>
      </div>
      <div className="h-1 rounded-full" style={{ background: 'var(--glass-1)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct * 100}%`, background: color }} />
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
          {current} / {total} seats
        </span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
          {label}
        </span>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'var(--glass-2)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct * 100}%`, background: `linear-gradient(90deg, ${color}CC, ${color})` }} />
      </div>
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────
export function Avatar({ user, size = 36 }) {
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const palettes = {
    admin:      ['#4C1D95', '#7C3AED'],
    superadmin: ['#4C1D95', '#7C3AED'],
    driver:     ['#065F46', '#10B981'],
    student:    ['#1E3A5F', '#3B82F6'],
  };
  const [from, to] = palettes[user?.role] || ['#374151', '#6B7280'];

  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        fontSize: Math.floor(size * 0.36),
        boxShadow: `0 2px 8px ${from}60`,
      }}>
      {initials}
    </div>
  );
}

export { BusLogo };
