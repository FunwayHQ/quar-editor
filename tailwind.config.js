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
        panel: {
          DEFAULT: '#18181B',
          80: 'rgba(24, 24, 27, 0.8)',
        },
        border: '#27272A',
        text: {
          primary: '#FAFAFA',
          secondary: '#A1A1AA',
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
      },
      backdropBlur: {
        glass: '8px',
      },
      spacing: {
        grid: '16px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
