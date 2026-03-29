/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        montserrat: ['Montserrat', 'sans-serif'],
      },
      colors: {
        bgdark: '#0a0a0a',
        bgmain: '#1f1f1f',
        bgpanel: '#2a2a2a',
      }
    },
  },
  plugins: [],
}
