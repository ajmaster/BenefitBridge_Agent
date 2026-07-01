"use client";

import Link from "next/link";

import type { Locale } from "@/components/conversation-atlas/i18n";
import { marketingCopyFor } from "@/components/marketing/marketingCopy";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LOCALES: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
];

const NON_GOALS_STATEMENT =
  "BenefitBridge does not determine eligibility, calculate benefit amounts, or submit applications.";

export function MarketingFooter({
  locale,
  onLocaleChange,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}) {
  const copy = marketingCopyFor(locale);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center">
        <Button asChild size="lg">
          <Link href="/app/chat/">{copy.heroCtaPrimary}</Link>
        </Button>

        <p className="max-w-xl text-sm text-ink-soft">{NON_GOALS_STATEMENT}</p>

        <div
          className="flex items-center gap-1 rounded-full border border-line bg-surface p-1"
          role="group"
          aria-label="Language"
        >
          {LOCALES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onLocaleChange(option.value)}
              aria-pressed={locale === option.value}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                locale === option.value
                  ? "bg-ink text-surface"
                  : "text-ink-soft hover:text-ink",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted">
          &copy; {year} BenefitBridge CA. {copy.footerTagline}
        </p>
      </div>
    </footer>
  );
}
