/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy:  { DEFAULT: '#0D2137', 50: '#E8EEF4', 100: '#C5D4E4', 200: '#8BAEC8', 300: '#5188AC', 400: '#2B6390', 500: '#1A4A72', 600: '#0D2137', 700: '#091929', 800: '#05101A', 900: '#02080D' },
        brand: { DEFAULT: '#1A56DB', 50: '#EEF3FD', 100: '#D4E2FA', 200: '#A9C5F5', 300: '#7EA8F0', 400: '#538BEB', 500: '#1A56DB', 600: '#1542AF', 700: '#0F3183', 800: '#0A2058', 900: '#05102C' },
        gold:  { DEFAULT: '#D97706', 50: '#FEF9EC', 100: '#FDF0C8', 200: '#FAE091', 300: '#F7D05A', 400: '#F4C023', 500: '#D97706', 600: '#AE5F05', 700: '#834703', 800: '#582F02', 900: '#2C1801' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-dot': 'bounceDot 1.4s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'marker-pop': 'markerPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0)', opacity: '0.3' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(16px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          from: { transform: 'translateY(-16px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        markerPop: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'card-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'glow-blue': '0 0 20px rgb(26 86 219 / 0.35)',
        'glow-gold': '0 0 20px rgb(217 119 6 / 0.35)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
};