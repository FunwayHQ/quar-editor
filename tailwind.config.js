/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0B',
        surface: {
          1: '#111113',
          2: '#1A1A1D',
          3: '#222225',
        },
        panel: {
          DEFAULT: '#18181B',
          80: 'rgba(24, 24, 27, 0.8)',
        },
        border: '#27272A',
        text: {
          primary: '#FAFAFA',
          secondary: '#A1A1AA',
          tertiary: '#71717A',
        },
        accent: {
          DEFAULT: '#7C3AED',
          light: '#A855F7',
          gradient: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        collab: {
          pink: '#EC4899',
          blue: '#3B82F6',
          green: '#10B981',
          orange: '#F59E0B',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
        modal: '12px',
      },
      boxShadow: {
        glass: '0 4px 6px rgba(0, 0, 0, 0.3)',
        glow: '0 0 20px rgba(124, 58, 237, 0.3)',
        'glow-sm': '0 0 10px rgba(124, 58, 237, 0.15)',
        'inner-subtle': 'inset 0 1px 0 rgba(255,255,255,0.04)',
        'header-glow': '0 1px 12px rgba(0,0,0,0.5)',
      },
      backdropBlur: {
        glass: '8px',
      },
      spacing: {
        grid: '16px',
      },
      fontFamily: {
        heading: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['IBM Plex Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'context-menu-appear': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(-2px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'scale-in': 'scale-in 0.15s ease-out',
        'slide-up': 'slide-up 0.15s ease-out',
        'context-menu': 'context-menu-appear 0.12s ease-out',
      },
    },
  },
  plugins: [],
}
