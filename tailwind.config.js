/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Alimentees par next/font dans app/layout.tsx. Utilisees uniquement
        // par les passeports dont la marque porte une charte typographique.
        display: ['var(--font-display)', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        body: ['var(--font-body)', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
