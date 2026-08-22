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
        //
        // A token is reachable as a utility class only if it is registered in all
        // three places: globals.css's :root, its @theme inline block, and here.
        // Miss this one and the class silently does not exist — no build error.
        ink: {
          950: 'var(--color-ink-950)',
          900: 'var(--color-ink-900)',
          800: 'var(--color-ink-800)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          soft: 'var(--color-accent-soft)',
          strong: 'var(--color-accent-strong)',
        },
        // Ink for anything sitting on an accent surface. The accent is bright
        // enough that white on it fails at 1.60:1, so this is not optional.
        'on-accent': 'var(--color-on-accent)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          card: 'var(--color-surface-card)',
          raised: 'var(--color-surface-raised)',
        },
        tint: {
          DEFAULT: 'var(--color-tint)',
          strong: 'var(--color-tint-strong)',
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
        warning: 'var(--color-warning)',
        'on-warning': 'var(--color-on-warning)',
        focus: 'var(--color-focus)',
      },
      boxShadow: {
        glow: 'var(--glow-accent)',
        'glow-soft': 'var(--glow-accent-soft)',
        raised: 'var(--shadow-raised)',
        overlay: 'var(--shadow-overlay)',
      },
      // Overriding the scale rather than adding aliases: ~120 rounded-* classes already
      // exist across the app, and remapping what they mean propagates the concentric
      // system to all of them without a sweep. The relationship is what matters — a
      // control inside a card must be rounder-than-nothing but flatter than its
      // container, and 6px controls inside 20px cards had that backwards.
      borderRadius: {
        sm: 'var(--radius-chip)',
        DEFAULT: 'var(--radius-chip)',
        md: 'var(--radius-control)',
        lg: 'var(--radius-panel)',
        xl: 'var(--radius-card)',
        '2xl': 'var(--radius-overlay)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
      },
      transitionDuration: {
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
      },
    },
  },
  plugins: [heroui()],
};

export default config;
