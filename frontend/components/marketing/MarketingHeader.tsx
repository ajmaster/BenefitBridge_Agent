"use client";

import Link from "next/link";

import type { Locale } from "@/components/conversation-atlas/i18n";
import { Button } from "@/components/ui/button";
import BrandMark from "@/components/workspace/icons/BrandMark";
import { marketingCopyFor } from "@/components/marketing/marketingCopy";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const LOCALES: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
];

export function MarketingHeader({
  locale,
  onLocaleChange,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}) {
  const copy = marketingCopyFor(locale);

  return (
    <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line bg-surface/90 px-6 py-4 backdrop-blur">
      <Link href="/" className="flex items-center gap-3 text-ink" aria-label={`${BRAND_NAME} home`}>
        <BrandMark />
        <span className="text-lg font-bold tracking-tight">{BRAND_NAME}</span>
      </Link>

      <div className="flex items-center gap-4">
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

        <Button asChild size="default">
          <Link href="/app/chat/">{copy.heroCtaPrimary}</Link>
        </Button>
      </div>
    </header>
  );
}
