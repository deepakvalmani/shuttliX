import { Sun, Moon, Monitor } from 'lucide-react';
import useThemeStore from '../../store/themeStore';

const CYCLE = { system: 'light', light: 'dark', dark: 'system' };
const ICONS = { dark: Moon, light: Sun, system: Monitor };
const LABELS = { dark: 'Dark', light: 'Light', system: 'Auto' };

export default function ThemeToggle({ size = 15 }) {
  const { preference, setTheme } = useThemeStore();
  const Icon = ICONS[preference] || Monitor;

  return (
    <button
      onClick={() => setTheme(CYCLE[preference] || 'dark')}
      className="btn-ghost btn-icon"
      title={`Theme: ${LABELS[preference]} → click to change`}
      style={{ color: 'var(--text-3)' }}>
      <Icon size={size} />
    </button>
  );
}
