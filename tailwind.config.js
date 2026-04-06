/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        wine: {
          DEFAULT: '#7D1F2C',
          deep: '#5C1520',
          light: '#9B2535',
          glow: 'rgba(125, 31, 44, 0.15)',
        },
        gold: {
          DEFAULT: '#D4AF37',
          muted: 'rgba(212, 175, 55, 0.12)',
          light: '#E5C158',
        },
        dark: {
          DEFAULT: '#0f0a0b',
          card: '#1a1014',
        },
        light: {
          DEFAULT: '#F7F4F0',
          surface: '#FFFFFF',
        },
        text: {
          primary: '#1a0e10',
          secondary: '#7a5c62',
          muted: '#b89ea3',
        },
        success: '#1a7a4a',
        warning: '#c47a1b',
        danger: '#991f2e',
        info: '#1a5c8a',
        gray: {
          50:  '#f5f2ee',
          100: '#ede9e3',
          200: '#e0dbd3',
          300: '#cfc8be',
          400: '#b8ada2',
          500: '#9a8e85',
          600: '#7a6d65',
          700: '#5a504a',
          800: '#3c342f',
          900: '#231e1a',
          950: '#141010',
        },
      },
      boxShadow: {
        'wine-sm': '0 1px 3px rgba(125,31,44,0.08)',
        'wine': '0 2px 8px rgba(125,31,44,0.10)',
        'wine-lg': '0 4px 14px rgba(125,31,44,0.15)',
        sm: '0 1px 4px rgba(60,40,20,0.07), 0 1px 2px rgba(60,40,20,0.04)',
        DEFAULT: '0 2px 8px rgba(60,40,20,0.09), 0 1px 3px rgba(60,40,20,0.05)',
        md: '0 4px 14px rgba(60,40,20,0.10), 0 2px 5px rgba(60,40,20,0.06)',
        lg: '0 8px 28px rgba(60,40,20,0.12), 0 3px 8px rgba(60,40,20,0.06)',
        xl: '0 16px 40px rgba(60,40,20,0.14), 0 6px 14px rgba(60,40,20,0.08)',
      },
      borderRadius: {
        lg:  '12px',
        xl:  '14px',
        '2xl': '18px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '104': '26rem',
      },
    },
  },
  plugins: [],
}