"use client";

import { motion } from "motion/react";

import type { Locale } from "@/components/conversation-atlas/i18n";
import { marketingCopyFor } from "@/components/marketing/marketingCopy";
import AtlasIcon, { type AtlasIconName } from "@/components/workspace/icons/AtlasIcon";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { cn } from "@/lib/utils";

const GRID_COLS_BY_LENGTH: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

export function HowItWorks({ locale }: { locale: Locale }) {
  const copy = marketingCopyFor(locale);
  const reduced = useReducedMotion();
  const steps = copy.howItWorksSteps;
  const gridColsClass = GRID_COLS_BY_LENGTH[steps.length] ?? "md:grid-cols-4";

  const initial = reduced ? { opacity: 0 } : { opacity: 0, y: 24 };
  const whileInView = reduced ? { opacity: 1 } : { opacity: 1, y: 0 };

  return (
    <section
      id="how-it-works"
      className="mx-auto max-w-6xl px-6 py-20 md:py-28"
    >
      <h2 className="text-center text-3xl font-bold tracking-tight text-ink md:text-4xl">
        {copy.howItWorksTitle}
      </h2>

      <div className={cn("mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2", gridColsClass)}>
        {steps.map((step, index) => (
          <motion.div
            key={step.title}
            initial={initial}
            whileInView={whileInView}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-6 text-center shadow-atlas-soft"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sky text-blue">
              <AtlasIcon name={step.icon as AtlasIconName} className="h-6 w-6" />
            </span>
            <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
            <p className="text-sm text-ink-soft">{step.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
