'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi, ApiRequestError } from '@/services/auth.apis';
import { useAuthStore } from '@/store/auth-store';

const BG_IMAGE =
  'https://w0.peakpx.com/wallpaper/925/598/HD-wallpaper-technology-programming-code-python-programming-language.jpg';

export default function RegisterPage() {
  const router = useRouter();
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);

    try {
      await authApi.register(name, email, password);

      // Đợi lấy thông tin user xong
      await refreshUser();

      // Lấy state mới nhất từ Zustand
      const user = useAuthStore.getState().user;

      // Bẻ lái dựa theo Role
      if (user?.role === 'ADMIN') {
        router.push('/admin/users');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.body.message);
      } else {
        setError('Đã có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ─── Left: Form ─── */}
      <div className="relative flex w-full flex-col justify-center px-8 py-20 lg:w-1/2 lg:px-20 xl:px-28">
        {/* Brand */}
        <div className="absolute left-8 top-8 flex items-center gap-2.5 lg:left-20 xl:left-28">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
              />
            </svg>
          </div>
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
            Code Judge
          </Link>
        </div>

        <div className="mx-auto w-full max-w-sm">
          {/* Heading */}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create an account</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Enter your information below to create your account
          </p>

          {/* Error */}
          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="register-name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Full name
              </label>
              <input
                id="register-name"
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="register-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="m@example.com"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="register-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="register-confirm"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Confirm password
              </label>
              <input
                id="register-confirm"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="cursor-pointer flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 active:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">Or continue with</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={() => authApi.googleLogin()}
            className="cursor-pointer flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>Google</span>
          </button>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-slate-900 underline-offset-4 hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </div>

      {/* ─── Right: Image ─── */}
      <div className="relative hidden lg:block lg:w-1/2">
        <img
          src={BG_IMAGE}
          alt="Code on digital interface"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />
        {/* Bottom-left quote */}
        <div className="absolute bottom-12 left-12 right-12">
          <blockquote className="text-lg font-medium leading-relaxed text-white/90">
            &ldquo;Join Code Judge today to begin your journey of mastering algorithms and improving
            your programming skills.&rdquo;
          </blockquote>
          <p className="mt-3 text-sm font-medium text-white/60">— Code Judge Team —</p>
        </div>
      </div>
    </div>
  );
}
