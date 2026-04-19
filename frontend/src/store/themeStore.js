import { create } from 'zustand';

const getSystem = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const apply = pref => {
  const resolved = pref === 'system' ? getSystem() : pref;
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
};

const useThemeStore = create((set, get) => ({
  preference: localStorage.getItem('sx-theme') || 'dark',
  resolved: 'dark',

  init() {
    const pref     = localStorage.getItem('sx-theme') || 'dark';
    const resolved = pref === 'system' ? getSystem() : pref;
    apply(pref);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (get().preference === 'system') apply('system');
    });
    set({ preference: pref, resolved });
  },

  setTheme(pref) {
    localStorage.setItem('sx-theme', pref);
    const resolved = pref === 'system' ? getSystem() : pref;
    apply(pref);
    set({ preference: pref, resolved });
  },
}));

export default useThemeStore;
