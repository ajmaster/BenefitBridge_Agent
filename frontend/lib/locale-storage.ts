import type { Locale } from "@/components/conversation-atlas/i18n";

const STORAGE_KEY = "bb-locale";

export function getStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "en" || value === "es" ? value : null;
}

export function setStoredLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, locale);
}
