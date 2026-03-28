/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgmain: '#1f1f1f',
        bgpanel: '#2a2a2a',
      }
    },
  },
  plugins: [],
}
