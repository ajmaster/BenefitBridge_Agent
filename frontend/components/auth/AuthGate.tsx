"use client";

import type { ReactNode } from "react";
import { authEnabled } from "@/lib/firebase";
import { AuthStateProvider, useAuthState } from "./AuthState";
import { SignInScreen } from "./SignInScreen";

function AuthGateInner({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthState();

  if (!authEnabled) return <>{children}</>;
  if (loading) return null;
  if (!user) return <SignInScreen />;
  return <>{children}</>;
}

// Client-side gate only: the frontend is a static export (`output: "export"`
// in next.config.mjs) with no server runtime, so there is no middleware to
// gate routes before render. The backend independently enforces ENABLE_AUTH
// on every /api/* call, so this gate is a UX convenience, not the security
// boundary.
export function AuthGate({ children }: { children: ReactNode }) {
  return (
    <AuthStateProvider>
      <AuthGateInner>{children}</AuthGateInner>
    </AuthStateProvider>
  );
}
