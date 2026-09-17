/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        ink: 'var(--ink)',
        card: 'var(--card)',
        accent: 'var(--accent)',
        'accent-fg': 'var(--accent-fg)',
        muted: 'var(--muted)',
        fur: 'var(--fur)',
        nose: 'var(--nose)',
      },
    },
  },
  plugins: [],
}
