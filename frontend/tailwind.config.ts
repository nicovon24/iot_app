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
          strong: 'var(--color-accent-strong)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          card: 'var(--color-surface-card)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
        },
        muted: 'var(--color-muted)',
        heading: 'var(--color-heading)',
        body: 'var(--color-body)',
        faint: 'var(--color-faint)',
        danger: {
          DEFAULT: 'var(--color-danger)',
          strong: 'var(--color-danger-strong)',
        },
        focus: 'var(--color-focus)',
      },
    },
  },
  plugins: [heroui()],
};

export default config;
