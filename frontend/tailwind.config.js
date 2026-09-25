/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#F8FAFC',
          secondary: '#FFFFFF',
          tertiary: '#F1F5F9',
        },
        border: '#E2E8F0',
        accent: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#EFF6FF',
        },
        success: {
          DEFAULT: '#16A34A',
          light: '#DCFCE7',
          text: '#15803D',
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#FEF3C7',
          text: '#B45309',
        },
        danger: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
          text: '#B91C1C',
        },
        purple: {
          DEFAULT: '#7C3AED',
          light: '#F3E8FF',
          text: '#6D28D9',
        },
        muted: {
          DEFAULT: '#64748B',
          dark: '#334155',
          light: '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}