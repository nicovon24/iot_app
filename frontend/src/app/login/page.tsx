'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { login } from '@/lib/auth';
import { ApiError } from '@/lib/api-client';

const PANEL_ICONS = [Activity, Wifi, Lock, Satellite, Laptop, RefreshCw, Brain, Zap, Cpu];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Invalid username or password.');
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
    <div className="flex min-h-screen w-full">
      {/* Left: form */}
      <div className="flex w-full flex-col justify-center px-8 py-12 sm:px-16 lg:w-1/2 lg:px-24">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400 text-white">
              <Zap className="h-6 w-6" fill="currentColor" />
            </div>
            <p className="text-center text-base font-medium text-slate-700">
              IoT Device Management
            </p>
          </div>

          <h1 className="mb-8 text-3xl font-semibold text-slate-900">Log in</h1>

          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-sm font-medium text-slate-700">
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
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
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <a href="#" className="-mt-3 text-sm font-medium text-slate-700 underline">
              Forgot your password?
            </a>

            <label className="flex items-center gap-2 text-sm text-slate-500">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-accent focus:ring-accent"
              />
              Remember me
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-white transition hover:brightness-90 disabled:opacity-60"
            >
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <a href="#" className="font-medium text-slate-700 underline">
              Sign up
            </a>
          </p>
        </div>
      </div>

      {/* Right: decorative panel */}
      <div className="relative hidden overflow-hidden bg-accent lg:flex lg:w-1/2 lg:items-center lg:justify-center">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -right-20 h-112 w-md rounded-full bg-white/10" />
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
