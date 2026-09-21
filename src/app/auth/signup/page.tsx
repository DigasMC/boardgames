"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { data, error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || undefined },
      },
    });
    setLoading(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    if (data.session) {
      router.push("/collection");
      router.refresh();
      return;
    }
    setMessage("Check your email to confirm your account, then sign in.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="card-shadow w-full max-w-md rounded-xl border border-secondary/10 bg-surface p-8">
        <h1 className="font-[family-name:var(--font-headline)] text-3xl font-bold text-primary">
          Join Vault &amp; Board
        </h1>
        <p className="mt-2 text-on-surface-variant">
          Create an account to track games and host sessions.
        </p>
        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-on-surface-variant">
              Display name
            </span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded-md bg-surface-container px-3 py-2 text-on-surface outline-none ring-primary focus:ring-1"
            />
          </label>
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
            <span className="font-semibold text-on-surface-variant">
              Password
            </span>
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
          {message && (
            <p className="rounded-md bg-primary-fixed px-3 py-2 text-sm text-on-primary-fixed">
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-3 font-bold text-on-primary disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-sm text-on-surface-variant">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
