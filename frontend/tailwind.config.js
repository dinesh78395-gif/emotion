/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'emotion-happy': '#facc15',
        'emotion-sad': '#3b82f6',
        'emotion-angry': '#ef4444',
        'emotion-surprised': '#f97316',
        'emotion-neutral': '#a78bfa',
        'emotion-fearful': '#7c3aed',
        'emotion-disgusted': '#22c55e',
      },
    },
  },
  plugins: [],
}
