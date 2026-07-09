'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function RegisterPage() {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({ email, password, displayName });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-4"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/20">
          <Mail size={24} className="text-success" />
        </div>
        <h1 className="mb-2 text-xl sm:text-2xl font-semibold text-text-primary">Check your email</h1>
        <p className="text-sm text-text-secondary leading-relaxed">
          We sent a verification link to{' '}
          <strong className="text-text-primary block mt-1">{email}</strong>
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover transition-colors font-medium"
        >
          Go to sign in
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </motion.div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-xl sm:text-2xl font-semibold text-text-primary">Create an account</h1>
      <p className="mb-6 sm:mb-8 text-sm text-text-secondary">Start collaborating in real-time</p>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div>
          <label htmlFor="displayName" className="mb-1.5 block text-sm text-text-secondary">
            Display name
          </label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg-primary/50 pl-10 pr-4 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-primary focus:bg-bg-primary placeholder:text-text-secondary/40"
              placeholder="Your name"
              required
              maxLength={50}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm text-text-secondary">
            Email
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg-primary/50 pl-10 pr-4 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-primary focus:bg-bg-primary placeholder:text-text-secondary/40"
              placeholder="you@example.com"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm text-text-secondary">
            Password
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg-primary/50 pl-10 pr-4 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-primary focus:bg-bg-primary placeholder:text-text-secondary/40"
              placeholder="Min. 8 characters"
              required
              minLength={8}
            />
          </div>
          <p className="mt-1.5 text-xs text-text-secondary">
            At least 8 characters, 1 uppercase letter, 1 number
          </p>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-danger"
          >
            {error}
          </motion.p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="relative w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Creating account...
            </span>
          ) : (
            'Create account'
          )}
        </button>
      </form>

      <p className="mt-6 sm:mt-8 text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:text-primary-hover transition-colors font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
