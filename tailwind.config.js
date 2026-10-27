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
        // Definies dans app/globals.css, polices chargees dans app/layout.tsx.
        // Utilisees uniquement par les passeports dont la marque porte une charte.
        display: ['var(--font-display)', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        body: ['var(--font-body)', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
