/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Sobrescreve gray com warm gray
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
        // white fica igual mas vai ser sobrescrito no CSS
        white: '#faf8f5',
      },
      backgroundColor: {
        white: '#faf8f5',
      },
      borderColor: {
        DEFAULT: 'rgba(90,60,40,0.12)',
      },
      boxShadow: {
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
    },
  },
  plugins: [],
}