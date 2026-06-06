export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1e40af', light: '#3b82f6', dark: '#1e3a8a' },
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
      }
    }
  },
  plugins: []
};
