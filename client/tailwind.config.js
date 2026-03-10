/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bear: {
          bg: '#0F0F0F',
          surface: '#1A1A1A',
          border: '#2A2A2A',
          accent: '#2563EB',
          'accent-hover': '#1D4ED8',
          text: '#F5F5F5',
          muted: '#9CA3AF',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
        },
        doctype: {
          rfi: '#F97316',
          change_order: '#10B981',
          submittal: '#2563EB',
          lien_waiver: '#8B5CF6',
          pay_app: '#EC4899',
          meeting_minutes: '#14B8A6',
          notice_to_owner: '#F59E0B',
          subcontract: '#6366F1',
          other: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'pulse-dot': 'pulseDot 1.4s infinite ease-in-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { transform: 'translateY(8px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        slideInLeft: { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        pulseDot: {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.4 },
          '40%': { transform: 'scale(1)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
