"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ProfileFormProps = {
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

function initialsFrom(displayName: string, email: string) {
  const source = displayName.trim() || email.trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function ProfileForm({
  email,
  displayName: initialDisplayName,
  avatarUrl,
}: ProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(initialDisplayName);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    setDisplayName(initialDisplayName);
    if (!editing) setDraftName(initialDisplayName);
  }, [initialDisplayName, editing]);

  const initials = initialsFrom(displayName || initialDisplayName, email);

  function startEditing() {
    setDraftName(displayName);
    setProfileError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setDraftName(displayName);
    setProfileError(null);
    setEditing(false);
  }

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: draftName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");
      const saved = data.profile.display_name ?? draftName;
      setDisplayName(saved);
      setDraftName(saved);
      setEditing(false);
      router.refresh();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setProfileLoading(false);
    }
  }

  function openPasswordModal() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
    setPasswordMessage(null);
    setPasswordOpen(true);
  }

  function closePasswordModal() {
    if (passwordLoading) return;
    setPasswordOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
    setPasswordMessage(null);
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    const supabase = createClient();

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (verifyError) {
      setPasswordLoading(false);
      setPasswordError("Current password is incorrect.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setPasswordLoading(false);
    if (updateError) {
      setPasswordError(updateError.message);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Password updated.");
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <div>
        <h1 className="font-[family-name:var(--font-headline)] text-3xl font-bold text-primary md:text-4xl">
          Profile
        </h1>
        <p className="mt-2 text-on-surface-variant">
          Your account details and security.
        </p>
      </div>

      <div className="card-shadow flex flex-col gap-6 rounded-xl border border-secondary/10 bg-surface p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="size-16 shrink-0 rounded-xl border-2 border-surface object-cover"
              />
            ) : (
              <div
                className="flex size-16 shrink-0 items-center justify-center rounded-xl border-2 border-surface bg-primary-container font-semibold text-on-primary-container"
                aria-hidden
              >
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-on-surface">
                {displayName.trim() || "No display name"}
              </p>
              <p className="truncate text-sm text-on-surface-variant">{email}</p>
            </div>
          </div>
          {!editing ? (
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-bold text-primary transition-colors hover:bg-surface-container-high"
            >
              <Pencil className="size-4" />
              Edit
            </button>
          ) : null}
        </div>

        {editing ? (
          <form onSubmit={onSaveProfile} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-on-surface-variant">
                Display name
              </span>
              <input
                required
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                autoFocus
                className="rounded-md bg-surface-container px-3 py-2 text-on-surface outline-none ring-primary focus:ring-1"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-on-surface-variant">Email</span>
              <p className="rounded-md bg-surface-container-low px-3 py-2 text-on-surface-variant">
                {email}
              </p>
            </label>
            {profileError && (
              <p className="rounded-md bg-error-container px-3 py-2 text-sm text-on-error-container">
                {profileError}
              </p>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={profileLoading}
                className="rounded-md px-4 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={profileLoading}
                className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-60"
              >
                {profileLoading ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        ) : (
          <dl className="flex flex-col gap-4 text-sm">
            <div className="flex flex-col gap-1">
              <dt className="font-semibold text-on-surface-variant">
                Display name
              </dt>
              <dd className="text-on-surface">
                {displayName.trim() || "—"}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="font-semibold text-on-surface-variant">Email</dt>
              <dd className="text-on-surface">{email || "—"}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="card-shadow rounded-xl border border-secondary/10 bg-surface p-6 md:p-8">
        <h2 className="font-[family-name:var(--font-headline)] text-xl font-bold text-primary">
          Security
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Update the password you use to sign in.
        </p>
        <button
          type="button"
          onClick={openPasswordModal}
          className="mt-4 rounded-lg bg-primary px-4 py-3 font-bold text-on-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-md active:translate-y-0 active:opacity-100"
        >
          Change password
        </button>
      </div>

      {passwordOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-primary/40"
            onClick={closePasswordModal}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            className="relative z-[70] flex w-full max-w-sm flex-col rounded-2xl border border-secondary/10 bg-surface shadow-lg"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-outline-variant/20 px-6 py-4">
              <h3
                id="change-password-title"
                className="font-[family-name:var(--font-headline)] text-lg font-semibold text-primary"
              >
                Change password
              </h3>
              <button
                type="button"
                onClick={closePasswordModal}
                disabled={passwordLoading}
                aria-label="Close"
                className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-60"
              >
                <X className="size-6" />
              </button>
            </div>
            <form onSubmit={onChangePassword}>
              <div className="flex flex-col gap-4 px-6 py-5">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-semibold text-on-surface-variant">
                    Current password
                  </span>
                  <input
                    required
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="rounded-md bg-surface-container px-3 py-2 text-on-surface outline-none ring-primary focus:ring-1"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-semibold text-on-surface-variant">
                    New password
                  </span>
                  <input
                    required
                    type="password"
                    minLength={6}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="rounded-md bg-surface-container px-3 py-2 text-on-surface outline-none ring-primary focus:ring-1"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-semibold text-on-surface-variant">
                    Confirm new password
                  </span>
                  <input
                    required
                    type="password"
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="rounded-md bg-surface-container px-3 py-2 text-on-surface outline-none ring-primary focus:ring-1"
                  />
                </label>
                {passwordError && (
                  <p className="rounded-md bg-error-container px-3 py-2 text-sm text-on-error-container">
                    {passwordError}
                  </p>
                )}
                {passwordMessage && (
                  <p className="rounded-md bg-primary-container/40 px-3 py-2 text-sm text-on-surface">
                    {passwordMessage}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-outline-variant/20 px-6 py-4">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={passwordLoading}
                  className="rounded-md px-4 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-60"
                >
                  {passwordMessage ? "Close" : "Cancel"}
                </button>
                {!passwordMessage ? (
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-60"
                  >
                    {passwordLoading ? "Updating…" : "Update password"}
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
