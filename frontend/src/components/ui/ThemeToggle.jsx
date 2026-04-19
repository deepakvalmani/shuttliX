import { Moon, Sun, Monitor } from 'lucide-react';
import useThemeStore from '../../store/themeStore';

export default function ThemeToggle() {
  const { preference, setTheme } = useThemeStore();

  const cycle = () => {
    const order = ['dark', 'light', 'system'];
    const next  = order[(order.indexOf(preference) + 1) % order.length];
    setTheme(next);
  };

  const Icon = preference === 'light' ? Sun : preference === 'system' ? Monitor : Moon;

  return (
    <button
      onClick={cycle}
      className="btn-ghost btn-icon"
      title={`Theme: ${preference}`}
      aria-label={`Switch theme (current: ${preference})`}
    >
      <Icon size={16} style={{ color: 'var(--text-3)' }} />
    </button>
  );
}
