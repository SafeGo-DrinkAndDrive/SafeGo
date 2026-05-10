

/** @type {import('tailwindcss').Config} */
export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#111111',
          darker: '#000000',
          card: 'rgba(17, 17, 17, 0.8)',
        },
        brand: {
          red: '#E53935',
          'red-light': '#FF6B6B',
          'red-dark': '#C62828',
          gray: '#6B7280',
        },
        text: {
          DEFAULT: '#FFFFFF',
          sub: '#9CA3AF',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'brand': '0 4px 20px rgba(229, 57, 53, 0.15)',
        'subtle': '0 4px 20px rgba(0, 0, 0, 0.5)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'radial-gradient(circle at 50% 50%, rgba(229, 57, 53, 0.1) 0%, rgba(17, 17, 17, 0) 50%)',
      }
    },
  },
  plugins: [],
}

