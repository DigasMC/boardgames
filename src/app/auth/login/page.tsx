"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
