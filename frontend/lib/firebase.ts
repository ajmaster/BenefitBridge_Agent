import { FirebaseError, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// Firebase Analytics is intentionally not initialized here: this project's
// telemetry policy (llm_wiki/safety/privacy-and-pii.md) restricts telemetry to
// bucketed, non-identifying data, and Firebase Analytics would add
// third-party client tracking beyond that policy.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

export const authEnabled = process.env.NEXT_PUBLIC_ENABLE_AUTH === "true";

const REQUIRED_FIREBASE_CONFIG: Array<[keyof typeof firebaseConfig, string]> = [
  ["apiKey", "NEXT_PUBLIC_FIREBASE_API_KEY"],
  ["authDomain", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"],
  ["projectId", "NEXT_PUBLIC_FIREBASE_PROJECT_ID"],
  ["storageBucket", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"],
  ["messagingSenderId", "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"],
  ["appId", "NEXT_PUBLIC_FIREBASE_APP_ID"],
];

export function firebaseAuthSetupIssue(): string | null {
  if (!authEnabled) return null;

  const missing = REQUIRED_FIREBASE_CONFIG.filter(([key]) => !firebaseConfig[key]).map(
    ([, envName]) => envName,
  );
  if (missing.length === 0) return null;

  return [
    "Firebase sign-in is enabled, but the web app SDK config is incomplete.",
    `Set ${missing.join(", ")} in frontend/.env.local, then restart the frontend dev server.`,
  ].join(" ");
}

export function firebaseAuthErrorMessage(err: unknown, action: "guest" | "google" | "email"): string {
  const code = err instanceof FirebaseError ? err.code : "";
  const fallback =
    action === "guest"
      ? "Guest sign-in failed."
      : action === "google"
        ? "Google sign-in failed."
        : "Sign-in failed.";

  if (code === "auth/configuration-not-found") {
    return [
      "Firebase Authentication is not initialized for this project, or this app is using the wrong Firebase project config.",
      "Enable Authentication for the project, enable Anonymous sign-in for guest access, verify authorized domains, and restart the frontend.",
    ].join(" ");
  }
  if (code === "auth/operation-not-allowed") {
    return "This Firebase sign-in provider is disabled. Enable the provider in Firebase Console > Authentication > Sign-in method.";
  }
  if (code === "auth/unauthorized-domain") {
    return "This domain is not authorized for Firebase Auth. Add localhost, 127.0.0.1, or the deployed domain in Firebase Console > Authentication > Settings > Authorized domains.";
  }
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

let firebaseApp: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp {
  const setupIssue = firebaseAuthSetupIssue();
  if (setupIssue) {
    throw new Error(setupIssue);
  }
  if (!firebaseApp) {
    firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);
  }
  return firebaseApp;
}

let firebaseAuth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!firebaseAuth) {
    firebaseAuth = getAuth(getFirebaseApp());
  }
  return firebaseAuth;
}
