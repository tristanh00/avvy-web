module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        'grayish-200': '#2E2E2E',
        'grayish-300': '#3D3D3D',
        'alert-blue': '#009BCC',
        'alert-red': '#E00000',
      },
      fontFamily: {
        'poppins': ["'Poppins'", 'sans-serif'],
        'zen': ["'Zen Dots'", 'cursive'],
      }
    },
  },
  plugins: [],
}
