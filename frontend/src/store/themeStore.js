import { create } from 'zustand';

// Theme values: 'dark' | 'light' | 'system'
const STORAGE_KEY = 'shutlix-theme';

const getSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const applyTheme = (pref) => {
  const resolved = pref === 'system' ? getSystemTheme() : pref;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.setAttribute('data-theme', resolved);
};

const useThemeStore = create((set, get) => ({
  preference: localStorage.getItem(STORAGE_KEY) || 'dark', // default dark
  resolved: 'dark',

  init: () => {
    const pref = localStorage.getItem(STORAGE_KEY) || 'dark';
    const resolved = pref === 'system' ? getSystemTheme() : pref;
    applyTheme(pref);

    // Listen for system changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (get().preference === 'system') applyTheme('system');
    });

    set({ preference: pref, resolved });
  },

  setTheme: (pref) => {
    localStorage.setItem(STORAGE_KEY, pref);
    applyTheme(pref);
    const resolved = pref === 'system' ? getSystemTheme() : pref;
    set({ preference: pref, resolved });
  },
}));

export default useThemeStore;
