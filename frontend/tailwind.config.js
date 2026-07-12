/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12172A',
        paper: '#F1EEE5',
        panel: '#FFFFFF',
        route: '#2F6F5E',
        'route-dark': '#204F42',
        signal: '#D98E04',
        stub: '#E4DFCF',
      },
      fontFamily: {
        display: ['"General Sans"', '"Inter"', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      fontSize: {
        'hero': '3.5rem',
        'hero-lg': '4.5rem',
        'section': '2rem',
        'section-lg': '2.5rem',
        'card-title': '1.25rem',
        'body': '0.9375rem',
        'body-sm': '0.8125rem',
        'meta': '0.75rem',
        'micro': '0.6875rem',
        'label': '0.6875rem',
      },
    },
  },
  plugins: [],
};
