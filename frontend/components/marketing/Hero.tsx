"use client";

import Link from "next/link";
import { motion } from "motion/react";

import type { Locale } from "@/components/conversation-atlas/i18n";
import { marketingCopyFor } from "@/components/marketing/marketingCopy";
import { HeroDemoLoop } from "@/components/marketing/HeroDemoLoop";
import { Button } from "@/components/ui/button";
import AtlasIcon, { type AtlasIconName } from "@/components/workspace/icons/AtlasIcon";
import { useReducedMotion } from "@/lib/useReducedMotion";

export function Hero({ locale }: { locale: Locale }) {
  const copy = marketingCopyFor(locale);
  const reduced = useReducedMotion();

  const initial = (y: number) => (reduced ? { opacity: 0 } : { opacity: 0, y });
  const animate = reduced ? { opacity: 1 } : { opacity: 1, y: 0 };

  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
      <div className="flex flex-col gap-6">
        <motion.div
          initial={initial(16)}
          animate={animate}
          transition={{ duration: 0.5, delay: 0 }}
          className="text-sm font-semibold uppercase tracking-wide text-blue"
        >
          {copy.heroKicker}
        </motion.div>

        <motion.h1
          initial={initial(16)}
          animate={animate}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="text-6xl font-extrabold tracking-tight text-ink md:text-7xl"
        >
          {copy.heroHeadline}
        </motion.h1>

        <motion.p
          initial={initial(16)}
          animate={animate}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="max-w-xl text-lg text-ink-soft"
        >
          {copy.heroSubhead}
        </motion.p>

        <motion.div
          initial={initial(16)}
          animate={animate}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="flex flex-wrap items-center gap-4"
        >
          <Button asChild size="lg">
            <Link href="/app/chat/">{copy.heroCtaPrimary}</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <a href="#how-it-works">{copy.heroCtaSecondary}</a>
          </Button>
        </motion.div>

        <motion.div
          initial={initial(16)}
          animate={animate}
          transition={{ duration: 0.5, delay: 0.32 }}
          className="grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3"
          aria-label="Agent capabilities"
        >
          {copy.heroCapabilities.map((capability) => (
            <div
              key={capability.label}
              className="flex min-w-0 items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink shadow-atlas-soft"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sky text-blue">
                <AtlasIcon name={capability.icon as AtlasIconName} className="h-4 w-4" />
              </span>
              <span className="min-w-0 leading-tight">{capability.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      <div>
        <HeroDemoLoop />
      </div>
    </section>
  );
}
