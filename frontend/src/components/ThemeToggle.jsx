import { Sun, Moon, Monitor } from 'lucide-react';
import useThemeStore from '../store/themeStore';

/**
 * ThemeToggle — compact cycling button (System → Light → Dark → System)
 * Shows current theme icon; click cycles to next.
 * Usage: <ThemeToggle /> in any header
 */
const ThemeToggle = () => {
  const { preference, setTheme } = useThemeStore();

  const OPTIONS = [
    { key: 'system', icon: Monitor, label: 'System default', next: 'light' },
    { key: 'light',  icon: Sun,     label: 'Light mode',     next: 'dark'  },
    { key: 'dark',   icon: Moon,    label: 'Dark mode',      next: 'system'},
  ];

  const current = OPTIONS.find(o => o.key === preference) || OPTIONS[0];
  const Icon = current.icon;

  return (
    <button
      onClick={() => setTheme(current.next)}
      className="btn-ghost btn-icon"
      title={`Theme: ${current.label} — click to change`}
      style={{ color: 'var(--text-3)' }}>
      <Icon size={16} />
    </button>
  );
};

export default ThemeToggle;
