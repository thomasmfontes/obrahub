/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
    },
    extend: {
      colors: {
        brand: {
          50: '#F0F5FA',
          100: '#E1ECF5',
          200: '#C2D9EB',
          300: '#94BCDD',
          700: '#1C4A73',
          800: '#132B45', // Cor de hover predominante
          900: '#0B1B2B', // Cor de marca oficial utilizada no app
          950: '#050E17',
        },
        surface: {
          light: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        '2xs': '0 1px 2px rgba(15, 23, 42, 0.04)',
        'soft': '0 2px 10px rgba(15, 41, 66, 0.05)',
        'float': '0 8px 24px rgba(15, 41, 66, 0.12)',
      },
      spacing: {
        '13': '3.25rem', // 52px
        '15': '3.75rem', // 60px
      }
    },
  },
  plugins: [],
}
