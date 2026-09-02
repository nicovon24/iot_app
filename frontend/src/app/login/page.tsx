'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Activity,
  ArrowRight,
  Brain,
  Cpu,
  Eye,
  EyeOff,
  Laptop,
  Lock,
  RefreshCw,
  Satellite,
  TriangleAlert,
  Wifi,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { login } from '@/lib';
import { ApiError } from '@/lib';

/**
 * The plate on the right of board 4b — the platform's surface area as nine numbered cells.
 *
 * It is decoration, but not arbitrary decoration: each cell names a real capability, which is
 * what lets the login screen say what the product does without a paragraph of marketing. The
 * highlighted cell is the one the visitor is currently standing in.
 */
const MODULES: { icon: LucideIcon; label: string }[] = [
  { icon: Activity, label: 'Telemetry' },
  { icon: Wifi, label: 'Connectivity' },
  { icon: Lock, label: 'Security' },
  { icon: Satellite, label: 'Gateway' },
  { icon: Laptop, label: 'Console' },
  { icon: RefreshCw, label: 'Sync' },
  { icon: Brain, label: 'Analytics' },
  { icon: Zap, label: 'Power' },
  { icon: Cpu, label: 'Edge' },
];

/** Index of the cell rendered as the active one — the console the user is logging into. */
const ACTIVE_MODULE = 4;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Invalid email or password.');
      } else if (err instanceof ApiError) {
        setError(`Login failed: ${err.message}`);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // One border colour drives both fields, so a rejected credential marks the pair rather than
  // leaving the user to guess which half the server objected to.
  const fieldBorder = error ? 'border-danger/60' : 'border-border-strong';

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-surface">
      {/* Three stacked atmospherics, all inert and all aria-hidden: the 80px grid that gives
       * the field its measure, one soft accent bloom off to the right, and a slow scan.
       * They are the only place the system permits a gradient — nothing here is content. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(70% 60% at 78% 42%, rgba(16,185,129,.1), transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="animate-scan pointer-events-none absolute inset-x-0 top-0 h-[100px]"
        style={{ background: 'linear-gradient(rgba(52,211,153,0), rgba(52,211,153,.045))' }}
      />

      <div className="relative z-10 flex min-h-screen flex-1 flex-col px-8 py-10 sm:px-14 sm:py-12">
        <header className="flex shrink-0 items-center gap-3">
          <Image
            src="/logo.png"
            alt="IoTArg logo"
            width={30}
            height={30}
            className="h-[30px] w-[30px] object-contain [filter:grayscale(1)_brightness(2.2)]"
            priority
          />
          <span className="text-base font-extrabold leading-none tracking-[-0.015em] text-heading">
            IoTArg
          </span>

          <span className="ml-auto flex items-center gap-2 border border-accent-strong/30 px-[11px] py-[7px]">
            <span aria-hidden className="animate-live h-1.5 w-1.5 bg-accent" />
            <span className="t-label !text-accent">Platform online</span>
          </span>
        </header>

        <div className="my-auto flex w-full items-stretch gap-16 py-10 xl:gap-[88px]">
          {/* The form. A 2px accent edge instead of a card — the board's whole premise is that
           * nothing floats, so the rule does the work the container used to. */}
          <div className="animate-fade-up flex w-full max-w-[452px] shrink-0 flex-col border-l-2 border-accent-strong pl-8">
            <span className="t-label !text-accent !tracking-[0.2em]">IoT device management</span>
            <h1 className="t-title mb-9 mt-[18px] text-[52px] tracking-[-0.038em] sm:text-[62px]">
              Log in
            </h1>

            <form className="flex flex-1 flex-col" onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-[9px]">
                <label htmlFor="email" className="t-field">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="username"
                  aria-invalid={!!error}
                  className={`w-full border bg-ink-950 px-[15px] py-[14px] text-sm text-body outline-none transition-colors duration-fast ease-out placeholder:text-faint focus:border-accent ${fieldBorder}`}
                />
              </div>

              <div className="mt-5 flex flex-col gap-[9px]">
                <label htmlFor="password" className="t-field">
                  Password
                </label>
                <div
                  className={`flex items-center gap-3 border bg-ink-950 px-[15px] py-[14px] transition-colors duration-fast ease-out focus-within:border-accent ${fieldBorder}`}
                >
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    aria-invalid={!!error}
                    className="min-w-0 flex-1 bg-transparent text-sm tracking-[0.22em] text-body outline-none placeholder:tracking-normal placeholder:text-faint"
                  />
                  <span aria-hidden className="h-4 w-px bg-border" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="shrink-0 text-muted transition-colors duration-fast ease-out hover:text-accent"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff size={16} strokeWidth={1.75} />
                    ) : (
                      <Eye size={16} strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              </div>

              {/* role="alert" so a screen reader hears the rejection; the accent edge is the
               * same gesture the form itself uses, in the failure colour. */}
              {error && (
                <p
                  role="alert"
                  className="mt-4 flex items-center gap-2.5 border-l-2 border-danger py-0.5 pl-3 text-[12.5px] font-semibold leading-snug text-danger"
                >
                  <TriangleAlert size={14} strokeWidth={1.75} className="shrink-0" />
                  {error}
                </p>
              )}

              <div className="mt-4 flex items-center gap-5">
                <label className="flex cursor-not-allowed items-center gap-2.5 opacity-60">
                  <input
                    type="checkbox"
                    disabled
                    className="h-[15px] w-[15px] border-border-strong accent-accent"
                  />
                  <span className="text-[12.5px] leading-none text-faint">Remember me</span>
                </label>
                <span
                  aria-disabled="true"
                  className="ml-auto cursor-not-allowed text-[12.5px] leading-none text-faint underline decoration-border underline-offset-4 opacity-60"
                >
                  Forgot your password?
                </span>
              </div>

              <div className="mt-auto pt-7">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-accent flex h-[52px] w-full items-center px-[18px] text-xs font-extrabold uppercase tracking-[0.12em] disabled:opacity-60"
                >
                  {submitting ? 'Logging in…' : 'Log in'}
                  <ArrowRight size={17} strokeWidth={1.75} className="ml-auto" />
                </button>
              </div>
            </form>
          </div>

          {/* column-reverse so the tagline reads first and the figure caption settles at the
           * foot of the plate, which is where a caption belongs. */}
          <div
            aria-hidden
            className="hidden min-w-0 flex-1 flex-col items-start justify-between gap-[26px] xl:flex"
          >
            {/* 30px type on a 1.15 leading carries ~2px of half-leading above its cap, so the
             * box aligns while the letters sit low. Pulling the block up by that much is what
             * makes the claim and the form's own heading read as sitting on one line. */}
            <p className="-mt-[2px] w-[324px] text-[30px] font-extrabold leading-[1.15] tracking-[-0.03em] text-muted text-pretty">
              Todos tus dispositivos, en una sola consola.
            </p>

            <div className="grid w-max grid-cols-3">
              {MODULES.map((module, i) => {
                const Icon = module.icon;
                const active = i === ACTIVE_MODULE;
                const col = i % 3;
                const row = Math.floor(i / 3);
                return (
                  <span
                    key={module.label}
                    className={`flex h-[92px] w-[108px] flex-col p-[11px] ${
                      col < 2 ? 'border-r border-border' : ''
                    } ${row < 2 ? 'border-b border-border' : ''} ${active ? 'bg-accent-strong' : ''}`}
                  >
                    <span className="flex items-start">
                      <Icon
                        size={active ? 22 : 20}
                        strokeWidth={1.75}
                        className={active ? 'text-on-accent' : 'text-accent/70'}
                      />
                      <span
                        className={`ml-auto font-mono text-[9px] leading-none ${
                          active ? 'text-on-accent/60' : 'text-faint'
                        }`}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </span>
                    <span
                      className={`mt-auto text-[8.5px] font-extrabold uppercase leading-none tracking-[0.14em] ${
                        active ? 'text-on-accent' : 'text-faint'
                      }`}
                    >
                      {module.label}
                    </span>
                  </span>
                );
              })}
            </div>

            <div className="flex w-[324px] items-baseline gap-3 border-t border-white/15 pt-[11px]">
              <span className="text-[10px] font-extrabold uppercase leading-none tracking-[0.18em] text-accent">
                Fig. 01
              </span>
              <span className="t-label !tracking-[0.18em]">Platform surface</span>
              <span className="t-label ml-auto !tracking-[0.18em]">09</span>
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 items-center gap-3.5 border-t-2 border-rule pt-[18px]">
          <span className="t-label">IoTArg · {new Date().getFullYear()}</span>
          <span className="ml-auto flex items-center gap-2">
            <Lock size={12} strokeWidth={1.75} className="text-faint" />
            <span className="t-label">Secure session</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
