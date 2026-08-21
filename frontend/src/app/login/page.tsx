'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Activity,
  Brain,
  Cpu,
  Eye,
  EyeOff,
  Laptop,
  Lock,
  RefreshCw,
  Satellite,
  Wifi,
  Zap,
} from 'lucide-react';
import { login } from '@/lib';
import { ApiError } from '@/lib';

const PANEL_ICONS = [Activity, Wifi, Lock, Satellite, Laptop, RefreshCw, Brain, Zap, Cpu];

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

  return (
    <div className="flex min-h-screen w-full bg-surface">
      {/* Left: form */}
      <div className="flex w-full flex-col justify-center px-8 py-12 sm:px-16 lg:w-1/2 lg:px-24">
        <div className="glass-card animate-fade-up mx-auto w-full max-w-sm p-8">
          <div className="mb-10 flex flex-col items-center gap-3">
            <Image src="/logo.png" alt="IoTArg logo" width={64} height={64} className="h-16 w-16 object-contain" priority />
            <p className="text-center text-base font-medium text-body">
              IoT Device Management
            </p>
          </div>

          <h1 className="mb-8 text-3xl font-semibold text-heading">Log in</h1>

          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-body">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full rounded-md border border-border-strong bg-white/5 px-3 py-2.5 text-sm text-heading placeholder:text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-body">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-md border border-border-strong bg-white/5 px-3 py-2.5 pr-10 text-sm text-heading placeholder:text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-faint hover:text-body"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <span
              aria-disabled="true"
              className="-mt-3 cursor-not-allowed text-sm font-medium text-faint underline opacity-60"
            >
              Forgot your password?
            </span>

            <label className="flex cursor-not-allowed items-center gap-2 text-sm text-faint opacity-60">
              <input
                type="checkbox"
                disabled
                className="h-4 w-4 rounded border-border accent-accent"
              />
              Remember me
            </label>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              style={{ background: 'var(--gradient-accent)' }}
              className="w-full rounded-md py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
            >
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>
        </div>
      </div>

      {/* Right: decorative panel */}
      <div
        className="relative hidden overflow-hidden lg:flex lg:w-1/2 lg:items-center lg:justify-center"
        style={{ background: 'var(--gradient-accent)' }}
      >
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 -right-20 h-112 w-md rounded-full bg-white/10 blur-2xl" />
        <div className="relative grid grid-cols-3 gap-10 p-10">
          {PANEL_ICONS.map((Icon, i) => (
            <div key={i} className="flex h-16 w-16 items-center justify-center">
              <Icon className="h-10 w-10 text-white/90" strokeWidth={1.5} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
