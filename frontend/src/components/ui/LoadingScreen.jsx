const LoadingScreen = ({ message = 'Loading ShutliX...' }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-6"
    style={{ background: 'var(--bg-base)' }}>
    {/* Animated bus icon */}
    <div className="relative">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--glass-2)', border: '1px solid var(--border-2)' }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <rect x="4" y="10" width="28" height="18" rx="4" fill="#1A56DB" />
          <rect x="7" y="6" width="22" height="8" rx="2" fill="rgba(255,255,255,0.8)" />
          <rect x="6" y="14" width="6" height="5" rx="1.5" fill="rgba(255,255,255,0.4)" />
          <rect x="15" y="14" width="6" height="5" rx="1.5" fill="rgba(255,255,255,0.4)" />
          <rect x="24" y="14" width="6" height="5" rx="1.5" fill="rgba(255,255,255,0.4)" />
          <circle cx="10" cy="29" r="3.5" fill="#0D2137" stroke="#1A56DB" strokeWidth="1.5" />
          <circle cx="26" cy="29" r="3.5" fill="#0D2137" stroke="#1A56DB" strokeWidth="1.5" />
        </svg>
      </div>
      {/* Pulse ring */}
      <div className="absolute inset-0 rounded-2xl animate-ping"
        style={{ border: '2px solid rgba(26,86,219,0.4)' }} />
    </div>

    <div className="text-center">
      <h1 className="text-xl font-display font-semibold mb-1"
        style={{ color: 'var(--text-1)' }}>
        ShutliX
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-3)' }}>{message}</p>
    </div>

    <div className="loader">
      <span /><span /><span />
    </div>
  </div>
);

export default LoadingScreen;