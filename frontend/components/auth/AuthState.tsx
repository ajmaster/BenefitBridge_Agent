"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { authEnabled, firebaseAuthSetupIssue, getFirebaseAuth } from "@/lib/firebase";

type AuthState = {
  user: User | null;
  loading: boolean;
};

const AuthStateContext = createContext<AuthState>({ user: null, loading: false });

export function AuthStateProvider({ children }: { children: ReactNode }) {
  const setupIssue = firebaseAuthSetupIssue();
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: authEnabled && !setupIssue,
  });

  useEffect(() => {
    if (!authEnabled || setupIssue) return undefined;
    return onAuthStateChanged(getFirebaseAuth(), (user) => {
      setState({ user, loading: false });
    });
  }, [setupIssue]);

  return <AuthStateContext.Provider value={state}>{children}</AuthStateContext.Provider>;
}

export function useAuthState(): AuthState {
  return useContext(AuthStateContext);
}
