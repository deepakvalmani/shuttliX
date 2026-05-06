import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Bus, MapPin, Bell, Shield, Zap, Globe, ArrowRight,
  Building2, GraduationCap, Truck, CheckCircle, Star,
  Navigation, Clock, Users, BarChart2, Smartphone,
} from 'lucide-react';
import api from '../services/api';
import ThemeToggle from '../components/ui/ThemeToggle';

// ── ANIMATED BUS ICON ─────────────────────────────────────
const BusIcon = ({ size = 24, color = 'white' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="7" width="18" height="12" rx="3" fill={color}/>
    <rect x="5" y="3" width="14" height="6" rx="2" fill={`${color}CC`}/>
    <rect x="4" y="10" width="4" height="3" rx="1" fill="rgba(0,0,0,0.3)"/>
    <rect x="10" y="10" width="4" height="3" rx="1" fill="rgba(0,0,0,0.3)"/>
    <rect x="16" y="10" width="3" height="3" rx="1" fill="rgba(0,0,0,0.3)"/>
    <circle cx="7" cy="20" r="2" fill="#0D2137" stroke={color} strokeWidth="1"/>
    <circle cx="17" cy="20" r="2" fill="#0D2137" stroke={color} strokeWidth="1"/>
  </svg>
);

// ── STAT COUNTER ─────────────────────────────────────────
const StatCounter = ({ value, label, suffix = '' }) => (
  <div className="text-center">
    <div className="font-display font-bold text-4xl mb-1" style={{ color: 'var(--text-1)' }}>
      {value}{suffix}
    </div>
    <div className="text-sm" style={{ color: 'var(--text-3)' }}>{label}</div>
  </div>
);

// ── FEATURE CARD ──────────────────────────────────────────
const FeatureCard = ({ icon: Icon, title, desc, color, delay = 0 }) => (
  <div className="glass-md rounded-2xl p-6 group transition-all hover:-translate-y-1">
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
      style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
      <Icon size={24} style={{ color }} />
    </div>
    <h3 className="font-display font-bold text-base mb-2" style={{ color: 'var(--text-1)' }}>{title}</h3>
    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-3)' }}>{desc}</p>
  </div>
);

// ── USER TYPE CARD ────────────────────────────────────────
const UserCard = ({ icon: Icon, role, title, desc, features, color, cta, ctaTo }) => (
  <div className="glass-md rounded-3xl p-8 flex flex-col"
    style={{ borderColor: `${color}33` }}>
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
      style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
      <Icon size={28} style={{ color }} />
    </div>
    <div className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color }}>
      {role}
    </div>
    <h3 className="font-display font-bold text-xl mb-3" style={{ color: 'var(--text-1)' }}>{title}</h3>
    <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-3)' }}>{desc}</p>
    <ul className="space-y-2 mb-7 flex-1">
      {features.map((f, i) => (
        <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
          <CheckCircle size={14} style={{ color, flexShrink: 0 }} /> {f}
        </li>
      ))}
    </ul>
    <Link to={ctaTo}
      className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
      style={{ background: color, color: 'white' }}>
      {cta} <ArrowRight size={16} />
    </Link>
  </div>
);

// ── LIVE ROUTE CARD ───────────────────────────────────────
const LiveRouteCard = ({ route }) => (
  <div className="rounded-2xl p-4 flex items-center gap-4"
    style={{ }}>
    <div className="w-1.5 h-12 rounded-full flex-shrink-0" style={{ background: route.color || '#1A56DB' }} />
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{route.name}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
        {route.shortCode} · {route.stops?.length || 0} stops
        {route.organizationId?.name && ` · ${route.organizationId.name}`}
      </p>
    </div>
    <span className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0"
      style={{ background: 'rgba(16,185,129,0.1)', color: '#34D399', border: '1px solid rgba(16,185,129,0.25)' }}>
      Active
    </span>
  </div>
);

// ── MAIN PUBLIC PAGE ──────────────────────────────────────
const PublicPage = () => {
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [rRes, sRes] = await Promise.all([
          api.get('/public/routes'),
          api.get('/public/stops'),
        ]);
        setRoutes(rRes.data.data || []);
        setStops(sRes.data.data || []);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>

      {/* ── NAVBAR ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(13,33,55,0.92)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(16px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1A56DB, #3B7FFF)' }}>
            <BusIcon size={18} />
          </div>
          <span className="font-display font-bold text-xl" style={{ color: 'var(--text-1)' }}>ShutliX</span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm transition-colors hover:text-white"
            style={{ color: 'var(--text-3)' }}>Features</a>
          <a href="#for-who" className="text-sm transition-colors hover:text-white"
            style={{ color: 'var(--text-3)' }}>For who</a>
          <a href="#routes" className="text-sm transition-colors hover:text-white"
            style={{ color: 'var(--text-3)' }}>Live Routes</a>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login"
            className="hidden sm:flex text-sm font-medium px-4 py-2 rounded-xl transition-all"
            style={{ color: 'var(--text-2)', border: '1px solid var(--border-2)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            Sign in
          </Link>
          <ThemeToggle />
          <Link to="/register"
            className="text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:opacity-90"
            style={{ background: 'var(--brand)', color: 'white' }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="px-6 pt-24 pb-20 text-center relative overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-10 rounded-full"
            style={{ background: 'radial-gradient(circle, #1A56DB, transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full opacity-5"
            style={{ background: '#8B5CF6', filter: 'blur(80px)' }} />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-8"
            style={{ background: 'rgba(26,86,219,0.1)', border: '1px solid rgba(26,86,219,0.3)', color: 'var(--brand)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Real-time · Multi-organisation · Worldwide
          </div>

          <h1 className="font-display font-bold mb-6" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', lineHeight: 1.1, color: 'var(--text-1)' }}>
            Smart shuttle tracking
            <br />
            <span style={{ color: 'var(--brand)' }}>for every organisation</span>
          </h1>

          <p className="text-lg leading-relaxed mb-10 mx-auto max-w-2xl" style={{ color: 'var(--text-3)' }}>
            Live GPS tracking, seat capacity display, smart notifications, and powerful fleet management —
            built for universities, corporations, hospitals, and any organisation with a fleet.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/admin/signup"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base transition-all hover:opacity-90"
              style={{ background: 'var(--brand)', color: 'white' }}>
              <Building2 size={18} /> Set up your organisation
            </Link>
            <Link to="/login"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base transition-all"
              style={{ color: 'var(--text-1)', border: '1px solid var(--border-2)', background: 'var(--glass-2)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-2)'}>
              Sign in to your account <ArrowRight size={16} />
            </Link>
          </div>

          {/* Animated dashboard preview */}
          <div className="rounded-3xl overflow-hidden mx-auto max-w-3xl"
            style={{ background: 'var(--glass-2)', border: '1px solid var(--border-2)', boxShadow: '0 40px 80px rgba(0,0,0,0.4)' }}>

            {/* Fake browser bar */}
            <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--glass-2)' }}>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#FFBD2E' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: '#28CA41' }} />
              </div>
              <div className="flex-1 mx-4 px-3 py-1 rounded-lg text-xs text-center" style={{ background: 'var(--glass-1)', color: 'var(--text-4)' }}>
                app.shutlix.com
              </div>
            </div>

            {/* Fake dashboard content */}
            <div className="p-6">
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Live Vehicles', val: '3', color: '#1A56DB' },
                  { label: 'Members', val: '847', color: '#10B981' },
                  { label: 'Trips Today', val: '24', color: '#D97706' },
                  { label: 'Active Routes', val: '3', color: '#8B5CF6' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--glass-2)', border: '1px solid var(--border)' }}>
                    <div className="font-bold text-xl mb-0.5" style={{ color }}>{val}</div>
                    <div className="text-xs" style={{ color: 'var(--text-4)' }}>{label}</div>
                  </div>
                ))}
              </div>
              {/* Fake map */}
              <div className="rounded-xl relative overflow-hidden" style={{ height: 120, background: '#0d1e2f' }}>
                <div className="absolute inset-0 opacity-20">
                  {/* Road lines */}
                  <div className="absolute" style={{ top: '40%', left: 0, right: 0, height: 2, background: '#1a3352' }} />
                  <div className="absolute" style={{ top: '70%', left: 0, right: 0, height: 2, background: '#1a3352' }} />
                  <div className="absolute" style={{ left: '35%', top: 0, bottom: 0, width: 2, background: '#1a3352' }} />
                  <div className="absolute" style={{ left: '65%', top: 0, bottom: 0, width: 2, background: '#1a3352' }} />
                </div>
                {/* Bus markers */}
                {[
                  { left: '20%', top: '35%', color: '#1A56DB', code: 'A' },
                  { left: '55%', top: '65%', color: '#D97706', code: 'B' },
                  { left: '75%', top: '30%', color: '#10B981', code: 'C' },
                ].map(({ left, top, color, code }) => (
                  <div key={code} className="absolute" style={{ left, top, transform: 'translate(-50%,-50%)' }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-lg"
                      style={{ background: color, border: '2px solid rgba(255,255,255,0.4)' }}>
                      {code}
                    </div>
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full" style={{ background: '#10B981', border: '1.5px solid #0D2137', transform: 'translate(30%,-30%)' }}>
                      <div className="w-full h-full rounded-full animate-ping" style={{ background: '#10B981', opacity: 0.6 }} />
                    </div>
                  </div>
                ))}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.5)', color: 'var(--text-3)' }}>
                  Live map · 3 vehicles active
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────── */}
      <section className="py-12" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--glass-2)' }}>
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatCounter value="Real-time" label="GPS Updates" />
          <StatCounter value="Any" label="Organisation Worldwide" />
          <StatCounter value="3" suffix=" roles" label="Admin · Student · Driver" />
          <StatCounter value="100%" label="Data Isolated Per Org" />
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-block text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4"
              style={{ background: 'rgba(26,86,219,0.1)', color: 'var(--brand)', border: '1px solid rgba(26,86,219,0.25)' }}>
              Platform Features
            </div>
            <h2 className="font-display font-bold text-3xl mb-4" style={{ color: 'var(--text-1)' }}>
              Everything you need to manage a fleet
            </h2>
            <p className="max-w-xl mx-auto" style={{ color: 'var(--text-3)' }}>
              From real-time GPS tracking to smart notifications — ShutliX handles every part of your shuttle operation.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Navigation, title: 'Live GPS Tracking', desc: 'Bus markers update every 3 seconds via WebSocket. Smooth animated movement on the map — no page refresh needed.', color: '#1A56DB' },
              { icon: Bell, title: 'Smart Notifications', desc: 'Students get notified when their shuttle is approaching, running late, or fully seated. Configurable per route.', color: '#8B5CF6' },
              { icon: MapPin, title: 'Worldwide Stop Manager', desc: 'Search any location on Earth, click the map to place a stop. Routes can span any campus or city globally.', color: '#D97706' },
              { icon: BarChart2, title: 'Analytics Dashboard', desc: 'Track ridership, trip frequency, driver performance, and route efficiency from one unified dashboard.', color: '#10B981' },
              { icon: Shield, title: 'Organisation Isolation', desc: 'IBA students never see FAST routes. Each organisation\'s data is fully isolated — guaranteed.', color: '#EF4444' },
              { icon: Smartphone, title: 'PWA Ready', desc: 'Install ShutliX on any phone. Works on mobile, tablet, and desktop with a native app feel.', color: '#F97316' },
              { icon: Globe, title: 'Multi-Tenant', desc: 'One platform powers unlimited organisations. Universities, corporations, hospitals — each with their own fleet.', color: '#06B6D4' },
              { icon: Zap, title: 'QR Code Onboarding', desc: 'Admin generates a QR code. Students scan it — org is pre-filled. Join an organisation in under 30 seconds.', color: '#FBBF24' },
              { icon: Clock, title: 'ETA Engine', desc: 'Drivers see next stop ETA calculated from their live GPS position. Students see arrival time on the map.', color: '#A78BFA' },
            ].map(props => <FeatureCard key={props.title} {...props} />)}
          </div>
        </div>
      </section>

      {/* ── FOR WHO ─────────────────────────────────────────── */}
      <section id="for-who" className="py-20 px-6" style={{ background: 'var(--glass-2)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display font-bold text-3xl mb-4" style={{ color: 'var(--text-1)' }}>
              Built for every role
            </h2>
            <p style={{ color: 'var(--text-3)' }}>
              Different experiences, one platform.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <UserCard
              icon={Building2}
              role="Organisation Admin"
              title="Run your entire fleet from one place"
              desc="Create routes, add stops anywhere on Earth, manage your vehicles, assign drivers, and broadcast announcements."
              color="#8B5CF6"
              features={[
                'Create routes on a live Google Map',
                'Place stops anywhere in the world',
                'Assign drivers to specific routes',
                'QR code for instant member onboarding',
                'Analytics: ridership, routes, ratings',
                'Emergency broadcast to all members',
              ]}
              cta="Create organisation"
              ctaTo="/admin/signup"
            />
            <UserCard
              icon={GraduationCap}
              role="Student / Member"
              title="Know exactly when your bus arrives"
              desc="Track live shuttle positions, see seat availability, get push notifications when your bus is close, and rate your rides."
              color="#1A56DB"
              features={[
                'Live animated bus map',
                'Real-time seat capacity display',
                'Arrival notifications',
                'Search stops, routes, any place',
                'Ride history and ratings',
                'Favourite stops shortcut',
              ]}
              cta="Join your organisation"
              ctaTo="/register"
            />
            <UserCard
              icon={Truck}
              role="Driver"
              title="Focus on driving, not paperwork"
              desc="Share your GPS automatically, update passenger count with one tap, see your full route with ETAs, and report delays instantly."
              color="#10B981"
              features={[
                'One-tap trip start / end',
                'Auto-broadcasts GPS location',
                'Live passenger counter',
                'Route map with stop ETAs',
                'Delay reporting to students',
                'Emergency SOS to admin',
              ]}
              cta="Register as driver"
              ctaTo="/register"
            />
          </div>
        </div>
      </section>

      {/* ── LIVE ROUTES ─────────────────────────────────────── */}
      <section id="routes" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl mb-4" style={{ color: 'var(--text-1)' }}>
              Active Routes
            </h2>
            <p style={{ color: 'var(--text-3)' }}>
              Public routes currently active on ShutliX
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="loader"><span/><span/><span/></div>
            </div>
          ) : routes.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {routes.slice(0, 6).map(route => <LiveRouteCard key={route._id} route={route} />)}
            </div>
          ) : (
            <div className="text-center py-12 rounded-2xl" style={{ }}>
              <Bus size={32} className="mx-auto mb-3" style={{ color: 'var(--text-4)' }} />
              <p style={{ color: 'var(--text-3)' }}>No public routes yet.</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-4)' }}>Organisations must enable public visibility for their routes.</p>
            </div>
          )}

          <div className="text-center">
            <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
              Sign in to see live bus positions, seat availability, and arrival times
            </p>
            <Link to="/login" className="btn-primary inline-flex items-center gap-2 px-8 py-3">
              Sign in for live tracking <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: 'var(--glass-2)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display font-bold text-3xl mb-4" style={{ color: 'var(--text-1)' }}>
            Ready to modernise your fleet?
          </h2>
          <p className="mb-10 text-lg" style={{ color: 'var(--text-3)' }}>
            Set up your organisation in minutes. Free to start.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/admin/signup"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold transition-all hover:opacity-90"
              style={{ background: 'var(--brand)', color: 'white' }}>
              <Building2 size={18} /> Create your organisation
            </Link>
            <Link to="/register"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold transition-all"
              style={{ color: 'var(--text-1)', border: '1px solid var(--border-2)', background: 'var(--glass-2)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--glass-2)'}>
              Join as member / driver <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="px-6 py-10" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1A56DB, #3B7FFF)' }}>
              <BusIcon size={16} />
            </div>
            <span className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>ShutliX</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: 'var(--text-4)' }}>
            <Link to="/login" className="hover:text-white transition-colors">Sign in</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register</Link>
            <Link to="/admin/signup" className="hover:text-white transition-colors">Create org</Link>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-4)' }}>Developed by Deepak Raj, Riya Kumari And Jiya Turshnai @ 2026</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicPage;
