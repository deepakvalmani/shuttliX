/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: { display: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { DEFAULT: '#7C3AED', light: '#A78BFA', dark: '#5B21B6' },
      },
      animation: {
        'slide-up':   'slide-up 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'fade-in':    'fade-in 0.2s ease-out',
        'scale-in':   'scale-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
