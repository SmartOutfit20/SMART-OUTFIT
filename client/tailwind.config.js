export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f1ff',
          100: '#ebe2ff',
          200: '#d5c5ff',
          300: '#bfa6ff',
          400: '#9f7dff',
          500: '#7a5af7',
          600: '#5f46d9',
          700: '#4937ad',
          800: '#322779',
          900: '#1d163f'
        }
      },
      boxShadow: {
        soft: '0 20px 60px rgba(16, 24, 40, 0.08)'
      }
    }
  },
  plugins: []
};
