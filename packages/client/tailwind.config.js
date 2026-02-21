/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        acid: {
          green: '#39FF14',
          pink: '#FF10F0',
          cyan: '#00F0FF',
          yellow: '#DFFF00',
          orange: '#FF6B00',
          purple: '#BF00FF',
        },
        glass: {
          bg: 'rgba(10, 10, 20, 0.6)',
          surface: 'rgba(20, 20, 40, 0.4)',
          light: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.1)',
        },
        // Совместимость со старыми классами
        dark: {
          bg: 'rgba(10, 10, 20, 0.6)',
          surface: 'rgba(20, 20, 40, 0.4)',
          accent: 'rgba(57, 255, 20, 0.15)',
          hover: 'rgba(255, 255, 255, 0.08)',
          border: 'rgba(255, 255, 255, 0.1)',
        },
        tricolor: {
          white: '#FFFFFF',
          blue: '#00F0FF',
          red: '#FF10F0',
        },
        primary: '#39FF14',
        'primary-light': '#50FF30',
        'primary-dark': '#20CC00',
        danger: '#FF10F0',
        success: '#39FF14',
        warning: '#DFFF00',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'neon-green': '0 0 5px #39FF14, 0 0 20px rgba(57, 255, 20, 0.3), 0 0 40px rgba(57, 255, 20, 0.1)',
        'neon-pink': '0 0 5px #FF10F0, 0 0 20px rgba(255, 16, 240, 0.3), 0 0 40px rgba(255, 16, 240, 0.1)',
        'neon-cyan': '0 0 5px #00F0FF, 0 0 20px rgba(0, 240, 255, 0.3), 0 0 40px rgba(0, 240, 255, 0.1)',
        'neon-yellow': '0 0 5px #DFFF00, 0 0 20px rgba(223, 255, 0, 0.3)',
        'neon-purple': '0 0 5px #BF00FF, 0 0 20px rgba(191, 0, 255, 0.3)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'bounce-in': 'bounceIn 0.3s ease-out',
        'neon-pulse': 'neonPulse 2s ease-in-out infinite',
        'bg-shift': 'bgShift 15s ease-in-out infinite',
        'glow-rotate': 'glowRotate 8s linear infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        neonPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        bgShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        glowRotate: {
          '0%': { filter: 'hue-rotate(0deg)' },
          '100%': { filter: 'hue-rotate(360deg)' },
        },
      },
      backdropBlur: {
        '2xl': '40px',
        '3xl': '64px',
      },
    },
  },
  plugins: [],
};
