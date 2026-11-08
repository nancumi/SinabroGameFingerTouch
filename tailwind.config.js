/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        'mini': '11px',
        'base-rule': '12px',
      },
      keyframes: {
        spotPulse: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)' },
          '50%': { transform: 'scale(1.05)', boxShadow: '0 0 30px rgba(56, 189, 248, 0.8)' },
        },
        winnerFlash: {
          '0%, 100%': { 
            transform: 'scale(1.08)',
            boxShadow: '0 0 40px 15px rgba(234, 179, 8, 0.9), 0 0 70px 30px rgba(249, 115, 22, 0.6)',
            borderColor: '#fef08a'
          },
          '50%': { 
            transform: 'scale(1.15)',
            boxShadow: '0 0 70px 25px rgba(250, 204, 21, 1), 0 0 110px 45px rgba(239, 68, 68, 0.8)',
            borderColor: '#ffffff'
          },
        },
        ripple: {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        }
      },
      animation: {
        'spot-pulse': 'spotPulse 1.5s ease-in-out infinite',
        'winner-flash': 'winnerFlash 0.35s ease-in-out infinite',
        'ripple': 'ripple 1.2s ease-out infinite',
      }
    },
  },
  plugins: [],
}

