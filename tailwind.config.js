/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './context/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        nfs: {
          dark:    '#005AA1', // Bleu foncé — sidebar, titres
          primary: '#00ABDF', // Bleu principal — boutons, liens actifs
          light:   '#00ABE1', // Bleu clair — hover, highlights
          white:   '#FFFFFF', // Blanc — fonds de cartes, texte sur fond bleu
          // Nuances dérivées utiles
          50:      '#f0f8ff',
          100:     '#d6eef9',
          200:     '#aad9f3',
          300:     '#60bfe8',
          bg:      '#f0f8ff', // Fond de page très léger
          border:  '#c5dff0', // Bordures subtiles
          muted:   '#64748b', // Texte secondaire
          text:    '#0d2d4a', // Texte principal sombre
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

