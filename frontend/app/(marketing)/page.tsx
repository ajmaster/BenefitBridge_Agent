"use client";

import { useState } from "react";

import type { Locale } from "@/components/conversation-atlas/i18n";
import { getStoredLocale, setStoredLocale } from "@/lib/locale-storage";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { DemoGallery } from "@/components/marketing/DemoGallery";
import { TrustStrip } from "@/components/marketing/TrustStrip";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export default function MarketingHome() {
  const [locale, setLocale] = useState<Locale>(() => getStoredLocale() ?? "en");

  function handleLocaleChange(next: Locale) {
    setLocale(next);
    setStoredLocale(next);
  }

  return (
    <>
      <MarketingHeader locale={locale} onLocaleChange={handleLocaleChange} />
      <Hero locale={locale} />
      <HowItWorks locale={locale} />
      <DemoGallery locale={locale} />
      <TrustStrip locale={locale} />
      <MarketingFooter locale={locale} onLocaleChange={handleLocaleChange} />
    </>
  );
}
