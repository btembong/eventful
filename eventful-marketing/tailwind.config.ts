import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-jakarta)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        slackey: ['var(--font-slackey)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        brand: {
          50:  '#F0F0F0',
          100: '#F0F0F0',
          200: '#F0F0F0',
          300: '#F07200',
          400: '#F07200',
          500: '#F07200',
          600: '#F07200',
          900: '#333333',
          950: '#333333',
        },
      },
      backgroundImage: {
        'hero-dots': 'radial-gradient(circle, rgba(240,114,0,0.15) 1px, transparent 1px)',
        'ticket-perf': 'repeating-linear-gradient(to bottom, transparent 0px, transparent 7px, rgba(0,0,0,0.08) 7px, rgba(0,0,0,0.08) 9px)',
      },
      backgroundSize: {
        'dots-sm': '20px 20px',
        'dots-md': '28px 28px',
      },
      boxShadow: {
        'ticket':        '0 24px 64px -8px rgba(51,51,51,0.55), 0 4px 16px -4px rgba(51,51,51,0.3)',
        'card-hover':    '0 24px 48px -8px rgba(240,114,0,0.20)',
        'cartoon':       '4px 4px 0 #333333',
        'cartoon-md':    '6px 6px 0 #333333',
        'cartoon-sm':    '2px 2px 0 #333333',
        'cartoon-brand': '4px 4px 0 #F07200',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        'fade-up': 'fade-up 0.5s ease-out forwards',
      },
    },
  },
  plugins: [animate],
};

export default config;
