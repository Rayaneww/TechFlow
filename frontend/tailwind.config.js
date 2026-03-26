/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#08090c',
        surface: '#10131a',
        'surface-2': '#171b24',
        'surface-3': '#1e2130',
        accent: '#c2f542',
        'accent-dim': '#8ab522',
        danger: '#ff453a',
        'danger-dim': '#c43028',
        muted: '#636878',
        dim: '#2e3140',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        'card-hover': '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.1)',
        glow: '0 0 24px rgba(194,245,66,0.25)',
        'glow-danger': '0 0 24px rgba(255,69,58,0.25)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite linear',
        float: 'float 4s ease-in-out infinite',
        fadeUp: 'fadeUp 0.4s ease forwards',
      },
    },
  },
  plugins: [],
}
