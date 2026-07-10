const mono = {
  50:  '#fafafa',
  100: '#f5f5f5',
  200: '#e5e5e5',
  205: '#e5e5e5',
  250: '#d4d4d4',
  300: '#d4d4d4',
  350: '#a3a3a3',
  400: '#a3a3a3',
  450: '#737373',
  500: '#737373',
  600: '#525252',
  650: '#404040',
  700: '#404040',
  750: '#262626',
  800: '#262626',
  850: '#171717',
  900: '#171717',
  950: '#0a0a0a',
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    // Override core colors completely to prevent default color values (blue-gray, greens, reds, blues)
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',
      slate: mono,
      gray: mono,
      zinc: mono,
      neutral: mono,
      stone: mono,
      red: mono,
      orange: mono,
      amber: mono,
      yellow: mono,
      green: mono,
      emerald: mono,
      teal: mono,
      cyan: mono,
      blue: mono,
      indigo: mono,
      purple: mono,
      pink: mono,
      medical: mono,
      accent: {
        DEFAULT: '#171717',
        dark: '#fafafa',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in':   'fadeIn 0.25s ease-out both',
        'fade-up':   'fadeUp 0.3s ease-out both',
        'slide-in':  'slideIn 0.25s ease-out both',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' },                         '100%': { opacity: '1' }               },
        fadeUp:  { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateX(-8px)' },'100%': { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}
