import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

// ── BusLogo ───────────────────────────────────────────────
export function BusLogo({ size = 24 }) {
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

// ── LoadingScreen — full-page initial load ────────────────
export function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center glow-violet"
            style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%)' }}
          >
            <BusLogo size={32} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full dot-green" />
        </div>
        <div className="loader"><span /><span /><span /></div>
      </div>
    </div>
  );
}

// ── PageLoader — Suspense fallback for lazy-loaded pages ──
export function PageLoader() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="flex items-center gap-3" style={{ color: 'var(--text-4)' }}>
        <div className="loader"><span /><span /><span /></div>
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}

// ── OfflineBanner — show when socket disconnects ──────────
export function OfflineBanner({ isReconnecting }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[999] flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium animate-slide-down"
      style={{ background: '#7F1D1D', color: '#FCA5A5', borderBottom: '1px solid #991B1B' }}
    >
      <WifiOff size={14} />
      {isReconnecting ? (
        <>
          <RefreshCw size={12} className="animate-spin" />
          Reconnecting…
        </>
      ) : (
        'You are offline — live tracking paused'
      )}
    </div>
  );
}

// ── CapacityBadge ─────────────────────────────────────────
export function CapacityBadge({ current = 0, total = 30, size = 'md' }) {
  const pct   = Math.min(current / (total || 1), 1);
  const color = pct >= 1 ? '#EF4444' : pct >= 0.8 ? '#F97316' : pct >= 0.5 ? '#F59E0B' : '#10B981';
  const label = pct >= 1 ? 'Full' : pct >= 0.8 ? 'Nearly full' : pct >= 0.5 ? 'Filling up' : 'Available';

  if (size === 'sm') return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>{current}/{total} seats</span>
        <span className="text-xs font-medium" style={{ color }}>{label}</span>
      </div>
      <div className="h-1 rounded-full" style={{ background: 'var(--glass-1)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct * 100}%`, background: color }}
        />
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>
          {current} / {total} seats
        </span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
        >
          {label}
        </span>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'var(--glass-2)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
      {Icon && (
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--glass-2)', border: '1px solid var(--border-1)' }}
        >
          <Icon size={24} style={{ color: 'var(--text-4)' }} />
        </div>
      )}
      <div>
        <p className="font-semibold text-sm" style={{ color: 'var(--text-2)' }}>{title}</p>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────
export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', confirmDanger = false, onConfirm, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="glass-heavy w-full max-w-sm rounded-2xl p-6 animate-scale-in"
        style={{ border: '1px solid var(--border-2)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-display font-bold text-lg mb-2" style={{ color: 'var(--text-1)' }}>
          {title}
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={onConfirm}
            className={`flex-1 ${confirmDanger ? 'btn-danger' : 'btn-primary'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
