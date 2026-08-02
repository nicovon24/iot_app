import type { Config } from 'tailwindcss';
import { heroui } from '@heroui/theme';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@heroui/theme/dist/**/*.{js,mjs}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Every value points at a CSS custom property (defined in globals.css's
        // :root), never a literal hex — a future white-label theme can swap the
        // whole palette at runtime by overwriting those variables, no rebuild needed.
        navy: {
          950: 'var(--color-navy-950)',
          900: 'var(--color-navy-900)',
          800: 'var(--color-navy-800)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          soft: 'var(--color-accent-soft)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          card: 'var(--color-surface-card)',
        },
        border: 'var(--color-border)',
        muted: 'var(--color-muted)',
      },
    },
  },
  plugins: [heroui()],
};

export default config;
