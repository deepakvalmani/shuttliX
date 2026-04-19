/**
 * components/CookieBanner.jsx
 * GDPR/PDPA-compliant cookie consent banner.
 * – Non-blocking (doesn't prevent app from loading)
 * – Remembers consent in localStorage
 * – Distinguishes necessary vs preference cookies
 * – Links to Privacy Policy
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, Shield, Check } from 'lucide-react';

const CONSENT_KEY = 'shuttlix-cookie-consent';

export const useCookieConsent = () => {
  const raw = localStorage.getItem(CONSENT_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

export const saveCookieConsent = (preferences) => {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({
    ...preferences,
    timestamp: new Date().toISOString(),
    version:   '1.0',
  }));
};

export default function CookieBanner() {
  const [visible,     setVisible]     = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [prefs, setPrefs] = useState({ necessary: true, preferences: true });

  useEffect(() => {
    const consent = useCookieConsent();
    if (!consent) {
      // Small delay so it doesn't flash during initial load
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const acceptAll = () => {
    saveCookieConsent({ necessary: true, preferences: true });
    setVisible(false);
  };

  const acceptSelected = () => {
    saveCookieConsent(prefs);
    setVisible(false);
  };

  const rejectOptional = () => {
    saveCookieConsent({ necessary: true, preferences: false });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[998] animate-slide-up"
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
    >
      <div
        className="max-w-2xl mx-auto m-4 rounded-2xl p-5 shadow-2xl"
        style={{
          background:    'var(--bg-layer2)',
          border:        '1px solid var(--border-2)',
          backdropFilter:'blur(20px)',
          boxShadow:     'var(--shadow-lg)',
        }}
      >
        {!showDetails ? (
          /* ── Simple view ─────────────────────────────── */
          <>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--brand-subtle)', border: '1px solid var(--border-brand)' }}>
                <Cookie size={18} style={{ color: 'var(--brand-light)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-1)' }}>
                  We use cookies &amp; browser storage
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
                  ShuttliX uses strictly necessary storage (authentication tokens) and optional preference cookies (theme, favourite stops).
                  We never use advertising or tracking cookies.{' '}
                  <Link to="/privacy" className="underline" style={{ color: 'var(--brand-light)' }}>
                    Privacy Policy →
                  </Link>
                </p>
              </div>
              <button
                onClick={rejectOptional}
                className="btn-ghost btn-icon flex-shrink-0"
                aria-label="Close and accept necessary only"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={rejectOptional}
                className="btn-secondary btn-sm"
              >
                Necessary only
              </button>
              <button
                onClick={() => setShowDetails(true)}
                className="btn-secondary btn-sm"
              >
                Customise
              </button>
              <button
                onClick={acceptAll}
                className="btn-primary btn-sm gap-1.5 ml-auto"
              >
                <Check size={13} />
                Accept all
              </button>
            </div>
          </>
        ) : (
          /* ── Detailed view ───────────────────────────── */
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-base" style={{ color: 'var(--text-1)' }}>
                Cookie preferences
              </h3>
              <button onClick={() => setShowDetails(false)} className="btn-ghost btn-icon">
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              {/* Necessary — always on */}
              <div className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'var(--glass-2)', border: '1px solid var(--border-1)' }}>
                <Shield size={16} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Strictly necessary</p>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399' }}>
                      Always on
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                    Authentication tokens required to keep you logged in. Cannot be disabled.
                  </p>
                </div>
              </div>

              {/* Preferences */}
              <div className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'var(--glass-2)', border: '1px solid var(--border-1)' }}>
                <Cookie size={16} style={{ color: 'var(--brand-light)', flexShrink: 0, marginTop: 2 }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Preference storage</p>
                    <button
                      onClick={() => setPrefs(p => ({ ...p, preferences: !p.preferences }))}
                      className="relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-200"
                      style={{ background: prefs.preferences ? 'var(--brand)' : 'var(--glass-3)', border: '1px solid var(--border-2)' }}
                      role="switch"
                      aria-checked={prefs.preferences}
                    >
                      <span
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200"
                        style={{ transform: prefs.preferences ? 'translateX(17px)' : 'translateX(1px)' }}
                      />
                    </button>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                    Your theme preference, favourite stops, and UI settings. Improves your experience across sessions.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={acceptSelected} className="btn-primary btn-sm gap-1.5">
                <Check size={13} />
                Save preferences
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
