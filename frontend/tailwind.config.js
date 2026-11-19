/** Brand tokens come from the original design (do not change without the client's OK). */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        green: { DEFAULT: '#123F35', 2: '#1D5B4C' },
        gold: '#C1922F',
        'gold-soft': '#E0B85C',
        terracotta: '#A9532A',
        accent: '#DD8452',
        cream: '#FDFBF6',
        sand: '#F5EDE0',
        blush: '#EFD9D1',
        ink: '#16211D',
        danger: '#A3261C',
      },
      fontFamily: {
        serif: ['Newsreader', 'serif'],
        sans: ['"DM Sans"', 'sans-serif'],
        ar: ['Almarai', 'sans-serif'],
        arhead: ['Tajawal', 'Almarai', 'sans-serif'],
      },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        'ring-cw': { to: { transform: 'rotate(360deg)' } },
        pulsedot: { '0%,100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.4, transform: 'scale(1.4)' } },
      },
      animation: {
        marquee: 'marquee 26s linear infinite',
        'ring-cw': 'ring-cw 40s linear infinite',
        pulsedot: 'pulsedot 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
