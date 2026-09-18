"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/collection";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (oauthError) {
      setLoading(false);
      setError(oauthError.message);
    }
  }

  return (
    <div className="card-shadow w-full max-w-md rounded-xl border border-secondary/10 bg-surface p-8">
      <h1 className="font-[family-name:var(--font-headline)] text-3xl font-bold text-primary">
        Vault &amp; Board
      </h1>
      <p className="mt-2 text-on-surface-variant">
        Sign in to manage your collection and game nights.
      </p>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-on-surface-variant">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md bg-surface-container px-3 py-2 text-on-surface outline-none ring-primary focus:ring-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-on-surface-variant">Password</span>
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md bg-surface-container px-3 py-2 text-on-surface outline-none ring-primary focus:ring-1"
          />
        </label>
        {error && (
          <p className="rounded-md bg-error-container px-3 py-2 text-sm text-on-error-container">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-4 py-3 font-bold text-on-primary disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-secondary/15" />
        <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          or
        </span>
        <div className="h-px flex-1 bg-secondary/15" />
      </div>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-secondary/20 bg-surface-container px-4 py-3 font-bold text-on-surface disabled:opacity-60"
      >
        <GoogleIcon />
        Sign in with Google
      </button>
      <p className="mt-6 text-sm text-on-surface-variant">
        New here?{" "}
        <Link href="/auth/signup" className="font-semibold text-primary">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense fallback={<div className="text-on-surface-variant">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
