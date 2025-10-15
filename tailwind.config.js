/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        mist: '#F2F4F3',
        forest: '#2D5A27',
        moss: '#6A994E',
        dusk: '#386641',
        clay: '#BC4749'
      },
      boxShadow: {
        soft: '0 8px 24px rgba(31, 41, 55, 0.12)'
      }
    }
  },
  plugins: []
};
