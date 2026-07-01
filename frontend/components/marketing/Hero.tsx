"use client";

import Link from "next/link";
import { motion } from "motion/react";

import type { Locale } from "@/components/conversation-atlas/i18n";
import { marketingCopyFor } from "@/components/marketing/marketingCopy";
import { HeroDemoLoop } from "@/components/marketing/HeroDemoLoop";
import { Button } from "@/components/ui/button";
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
      </div>

      <div>
        <HeroDemoLoop />
      </div>
    </section>
  );
}
