/**
 * pages/PrivacyPolicyPage.jsx
 * Professional privacy policy page for ShuttliX.
 * Covers: data collected, usage, storage, rights, cookies, contact.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, Mail, Globe, Clock } from 'lucide-react';
import { BusLogo } from '../components/ui/index';

const LAST_UPDATED = 'April 18, 2025';
const CONTACT_EMAIL = 'privacy@shuttlix.app';

const Section = ({ icon: Icon, title, children }) => (
  <section className="mb-10">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--brand-subtle)', border: '1px solid var(--border-brand)' }}>
        <Icon size={16} style={{ color: 'var(--brand-light)' }} />
      </div>
      <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>{title}</h2>
    </div>
    <div className="text-sm leading-relaxed space-y-3" style={{ color: 'var(--text-2)' }}>
      {children}
    </div>
  </section>
);

const Li = ({ children }) => (
  <li className="flex gap-2">
    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--brand)' }} />
    <span>{children}</span>
  </li>
);

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>

      {/* Header */}
      <header
        className="sticky top-0 z-20 px-6 py-4 flex items-center gap-4"
        style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-1)', backdropFilter: 'blur(20px)' }}
      >
        <Link to="/" className="btn-ghost btn-icon flex-shrink-0">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-light))' }}>
            <BusLogo size={16} />
          </div>
          <span className="font-display font-bold text-base" style={{ color: 'var(--text-1)' }}>ShuttliX</span>
        </div>
        <span className="text-sm ml-auto" style={{ color: 'var(--text-4)' }}>Privacy Policy</span>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">

        {/* Hero */}
        <div className="mb-12">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: 'var(--brand-subtle)', border: '1px solid var(--border-brand)' }}>
            <Shield size={28} style={{ color: 'var(--brand-light)' }} />
          </div>
          <h1 className="font-display font-bold text-4xl mb-3" style={{ color: 'var(--text-1)' }}>
            Privacy Policy
          </h1>
          <p className="text-base" style={{ color: 'var(--text-3)' }}>
            This policy describes how ShuttliX collects, uses, and protects your personal information when you use our platform.
          </p>
          <div className="flex items-center gap-2 mt-4 text-xs" style={{ color: 'var(--text-4)' }}>
            <Clock size={12} />
            Last updated: {LAST_UPDATED}
          </div>
        </div>

        <Section icon={Eye} title="Information We Collect">
          <p>We collect the following categories of information when you use ShuttliX:</p>
          <ul className="space-y-1.5 mt-2">
            <Li><strong style={{ color: 'var(--text-1)' }}>Account information</strong> — your name, email address, and password (stored as a salted bcrypt hash; we never store your plaintext password).</Li>
            <Li><strong style={{ color: 'var(--text-1)' }}>Role-specific information</strong> — student ID (for students), driver's licence number (for drivers), and organisation membership.</Li>
            <Li><strong style={{ color: 'var(--text-1)' }}>Location data</strong> — GPS coordinates are collected from drivers during active trips only and are transmitted in real time to your organisation's members. Location data is stored in volatile memory (Redis) and automatically deleted within 60 seconds when a trip ends or a driver disconnects.</Li>
            <Li><strong style={{ color: 'var(--text-1)' }}>Usage data</strong> — login timestamps, IP addresses, and device type are recorded for security and fraud prevention.</Li>
            <Li><strong style={{ color: 'var(--text-1)' }}>Messages</strong> — chat messages sent within the platform are stored in encrypted-at-rest databases and are visible only to participants in that conversation.</Li>
          </ul>
        </Section>

        <Section icon={Database} title="How We Use Your Information">
          <ul className="space-y-1.5">
            <Li>To provide real-time shuttle tracking and route information to your organisation.</Li>
            <Li>To authenticate your identity and maintain secure sessions.</Li>
            <Li>To send you transactional emails (OTP codes, password resets). We do not send marketing emails without explicit consent.</Li>
            <Li>To generate anonymised analytics (trip counts, peak hours) for your organisation's administrators.</Li>
            <Li>To detect and prevent fraudulent or abusive activity on the platform.</Li>
          </ul>
          <p className="mt-3">
            We <strong style={{ color: 'var(--text-1)' }}>do not</strong> sell, rent, or share your personal information with third parties for their marketing purposes.
          </p>
        </Section>

        <Section icon={Lock} title="Data Storage &amp; Security">
          <p>ShuttliX takes the following measures to protect your data:</p>
          <ul className="space-y-1.5 mt-2">
            <Li>All data is transmitted over TLS/HTTPS encryption.</Li>
            <Li>Passwords are hashed using bcrypt with a minimum cost factor of 12 — they cannot be reversed.</Li>
            <Li>Access tokens expire after 15 minutes; refresh tokens expire after 7 days.</Li>
            <Li>Authentication is protected by account lockout after 5 consecutive failed attempts.</Li>
            <Li>Live GPS position data is stored only in RAM (Redis) and never written to permanent storage beyond anonymised trip summaries.</Li>
            <Li>All databases use encryption at rest and are access-controlled with role-based permissions.</Li>
          </ul>
          <p className="mt-3">
            In the event of a data breach that affects your personal information, we will notify you and the relevant authorities as required by applicable law within 72 hours.
          </p>
        </Section>

        <Section icon={Globe} title="Cookies &amp; Local Storage">
          <p>ShuttliX uses the following browser storage mechanisms:</p>
          <ul className="space-y-1.5 mt-2">
            <Li><strong style={{ color: 'var(--text-1)' }}>Strictly necessary (cannot be disabled)</strong> — authentication tokens stored in <code style={{ background: 'var(--glass-2)', padding: '1px 4px', borderRadius: 4 }}>localStorage</code> under keys <code style={{ background: 'var(--glass-2)', padding: '1px 4px', borderRadius: 4 }}>accessToken</code> and <code style={{ background: 'var(--glass-2)', padding: '1px 4px', borderRadius: 4 }}>refreshToken</code>. These are required for you to stay logged in.</Li>
            <Li><strong style={{ color: 'var(--text-1)' }}>Preferences (can be disabled)</strong> — your theme preference (<code style={{ background: 'var(--glass-2)', padding: '1px 4px', borderRadius: 4 }}>sx-theme</code>) and favourite stops. These persist your UI settings across sessions.</Li>
          </ul>
          <p className="mt-3">
            We do not use third-party advertising cookies. We do not use tracking pixels or cross-site tracking of any kind. You can clear all stored data at any time by logging out or clearing your browser storage.
          </p>
        </Section>

        <Section icon={Shield} title="Your Rights">
          <p>Depending on your location, you may have the following rights regarding your personal data:</p>
          <ul className="space-y-1.5 mt-2">
            <Li><strong style={{ color: 'var(--text-1)' }}>Access</strong> — request a copy of the personal data we hold about you.</Li>
            <Li><strong style={{ color: 'var(--text-1)' }}>Correction</strong> — request correction of inaccurate or incomplete data.</Li>
            <Li><strong style={{ color: 'var(--text-1)' }}>Deletion</strong> — request deletion of your account and associated personal data. Contact your organisation administrator or email us directly.</Li>
            <Li><strong style={{ color: 'var(--text-1)' }}>Portability</strong> — request an export of your personal data in a machine-readable format.</Li>
            <Li><strong style={{ color: 'var(--text-1)' }}>Objection</strong> — object to certain processing of your data, including profiling.</Li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--brand-light)' }}>{CONTACT_EMAIL}</a>.
            We will respond within 30 days.
          </p>
        </Section>

        <Section icon={Mail} title="Contact Us">
          <p>
            If you have any questions about this privacy policy or how we handle your data, please contact us:
          </p>
          <div className="mt-4 p-5 rounded-2xl" style={{ background: 'var(--glass-2)', border: '1px solid var(--border-1)' }}>
            <p className="font-semibold" style={{ color: 'var(--text-1)' }}>ShuttliX Privacy Team</p>
            <p className="mt-1">
              Email:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--brand-light)' }}>{CONTACT_EMAIL}</a>
            </p>
          </div>
        </Section>

        {/* Footer */}
        <div className="pt-8 mt-8" style={{ borderTop: '1px solid var(--border-1)' }}>
          <p className="text-xs text-center" style={{ color: 'var(--text-5)' }}>
            © {new Date().getFullYear()} ShuttliX. This policy may be updated from time to time. We will notify you of material changes via email or an in-app notice.
          </p>
          <div className="flex justify-center gap-6 mt-4">
            <Link to="/" className="text-xs hover:underline" style={{ color: 'var(--text-4)' }}>Home</Link>
            <Link to="/login" className="text-xs hover:underline" style={{ color: 'var(--text-4)' }}>Login</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
