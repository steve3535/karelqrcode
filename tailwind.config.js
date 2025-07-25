/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Elegant Wedding Color Palette
        'rose': {
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F9A8D4',
          400: '#F472B6',
          500: '#EC4899',
          600: '#DB2777',
          700: '#BE185D',
          800: '#9D174D',
          900: '#831843',
        },
        'gold': {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        'sage': {
          50: '#F6F7F6',
          100: '#E3E7E3',
          200: '#C7D0C7',
          300: '#A3B3A3',
          400: '#7A907A',
          500: '#5A715A',
          600: '#475A47',
          700: '#3A483A',
          800: '#2F3A2F',
          900: '#272F27',
        },
        'cream': {
          50: '#FDF8F3',
          100: '#FAF5F0',
          200: '#F5EDE6',
          300: '#EDE0D4',
          400: '#E2CEC0',
          500: '#D4B8A8',
          600: '#C4A494',
          700: '#B08F7F',
          800: '#9A7A6A',
          900: '#7F6557',
        },
        'navy': {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
      },
      fontFamily: {
        'playfair': ['Playfair Display', 'serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      animation: {
        'fadeInUp': 'fadeInUp 0.6s ease-out',
        'fadeInScale': 'fadeInScale 0.5s ease-out',
        'pulse-gentle': 'pulse-gentle 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(30px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        fadeInScale: {
          '0%': {
            opacity: '0',
            transform: 'scale(0.95)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
        'pulse-gentle': {
          '0%, 100%': {
            transform: 'scale(1)',
          },
          '50%': {
            transform: 'scale(1.02)',
          },
        },
        float: {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-10px)',
          },
        },
        shimmer: {
          '0%': {
            backgroundPosition: '-200px 0',
          },
          '100%': {
            backgroundPosition: 'calc(200px + 100%) 0',
          },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'elegant': '0 20px 40px rgba(212, 175, 55, 0.1), 0 8px 16px rgba(44, 62, 80, 0.05)',
        'elegant-hover': '0 25px 50px rgba(212, 175, 55, 0.15), 0 12px 24px rgba(44, 62, 80, 0.08)',
      },
    },
  },
  plugins: [],
}