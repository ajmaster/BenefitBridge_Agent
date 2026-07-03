"use client";

import { useState, type FormEvent } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import {
  firebaseAuthErrorMessage,
  firebaseAuthSetupIssue,
  getFirebaseAuth,
} from "@/lib/firebase";
import { BRAND_NAME } from "@/lib/brand";

export function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const setupIssue = firebaseAuthSetupIssue();

  async function handleGoogleSignIn() {
    if (setupIssue) {
      setError(setupIssue);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
    } catch (err) {
      setError(firebaseAuthErrorMessage(err, "google"));
    } finally {
      setBusy(false);
    }
  }

  async function handleGuestSignIn() {
    if (setupIssue) {
      setError(setupIssue);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signInAnonymously(getFirebaseAuth());
    } catch (err) {
      setError(firebaseAuthErrorMessage(err, "guest"));
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (setupIssue) {
      setError(setupIssue);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "sign-up") {
        await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
      } else {
        await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      }
    } catch (err) {
      setError(firebaseAuthErrorMessage(err, "email"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="w-full max-w-sm rounded-lg border border-line bg-white p-6 shadow-atlas-soft">
        <h1 className="text-xl font-semibold text-ink">Sign in to {BRAND_NAME}</h1>
        <p className="mt-1 text-sm text-muted">
          This demo is gated behind sign-in. No benefits data is tied to your account.
        </p>
        {setupIssue && (
          <p className="mt-3 rounded-md border border-red/30 bg-red/5 p-3 text-sm text-red">
            {setupIssue}
          </p>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
        >
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-2 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <form className="grid gap-3" onSubmit={handleEmailSubmit}>
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-lg border border-line px-3 py-2 text-sm text-ink"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-lg border border-line px-3 py-2 text-sm text-ink"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {mode === "sign-up" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode((current) => (current === "sign-up" ? "sign-in" : "sign-up"))}
          className="mt-3 text-xs font-medium text-blue"
        >
          {mode === "sign-up" ? "Already have an account? Sign in" : "Need an account? Create one"}
        </button>

        <div className="my-4 flex items-center gap-2 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <button
          type="button"
          onClick={handleGuestSignIn}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
        >
          Continue as Guest
        </button>
        <p className="mt-2 text-xs text-muted">
          Guest sessions are temporary and are not saved to an account.
        </p>

        {error && <p className="mt-3 text-sm text-red">{error}</p>}
      </div>
    </div>
  );
}
