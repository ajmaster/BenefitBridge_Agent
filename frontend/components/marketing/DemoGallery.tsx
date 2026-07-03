"use client";

import { useState } from "react";
import { motion } from "motion/react";

import type { Locale } from "@/components/conversation-atlas/i18n";
import { marketingCopyFor } from "@/components/marketing/marketingCopy";
import AtlasIcon from "@/components/workspace/icons/AtlasIcon";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReducedMotion } from "@/lib/useReducedMotion";

// Copy (title/subtitle/audience) and accent colors are sourced verbatim from
// `demo-videos/benefitbridge-remotion/src/flows.ts`. Video/poster filenames follow that
// project's `out/` naming convention (`<slug>.mp4` / `<slug>-still.png`, except
// conversation-atlas which uses `-poster.png`).
//
// As of this task, only the conversation-atlas assets have been copied into
// `frontend/public/demo-videos/` (confirmed via directory listing). The other three
// flows' video/poster files exist under `demo-videos/benefitbridge-remotion/out/` but have
// NOT yet been copied into `frontend/public/demo-videos/` -- that copy step is a follow-up
// asset-sync gap. Per the task brief, we skip rendering a card for any flow whose asset is
// confirmed missing rather than link to a 404.
type DemoFlowCard = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  audience: string;
  accent: string;
  assetsPresent: boolean;
};

const DEMO_FLOWS: DemoFlowCard[] = [
  {
    id: "SanJoseFamilyNavigator",
    slug: "sanjose-family-navigator",
    title: "San Jose Family Navigator",
    subtitle: "Food, health coverage, utilities, WIC, and prep packet handoff",
    audience: "Synthetic San Jose household",
    accent: "#1f8a5b",
    assetsPresent: false,
  },
  {
    id: "SfFoodShelterHandoff",
    slug: "sf-food-shelter-handoff",
    title: "San Francisco Food And Shelter Handoff",
    subtitle: "Urgent local help without live availability claims",
    audience: "Synthetic SF adult",
    accent: "#2563eb",
    assetsPresent: false,
  },
  {
    id: "SpanishWicPrep",
    slug: "spanish-wic-prep",
    title: "Spanish And WIC Prep",
    subtitle: "Bilingual intake, missing facts, WIC, food, and health prep",
    audience: "Synthetic Spanish-preference family",
    accent: "#7c3aed",
    assetsPresent: false,
  },
  {
    id: "ConversationAtlasDemo",
    slug: "conversation-atlas",
    title: "Conversation Atlas Demo",
    subtitle: "Voice/chat agent, safe maps, reminders, official sources, and Spanish UI",
    audience: "Public demo scenario",
    accent: "#0f766e",
    assetsPresent: true,
  },
];

function assetPaths(flow: DemoFlowCard) {
  const poster =
    flow.slug === "conversation-atlas"
      ? "/demo-videos/conversation-atlas-poster.png"
      : `/demo-videos/${flow.slug}-still.png`;
  const video = `/demo-videos/${flow.slug}.mp4`;
  return { poster, video };
}

export function DemoGallery({ locale }: { locale: Locale }) {
  const copy = marketingCopyFor(locale);
  const reduced = useReducedMotion();
  const [activeFlow, setActiveFlow] = useState<DemoFlowCard | null>(null);

  const flowsToRender = DEMO_FLOWS.filter((flow) => flow.assetsPresent);

  const initial = reduced ? { opacity: 0 } : { opacity: 0, y: 24 };
  const whileInView = reduced ? { opacity: 1 } : { opacity: 1, y: 0 };
  const whileHover = reduced ? undefined : { scale: 1.02 };

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">
          {copy.demoGalleryTitle}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-soft">
          {copy.demoGallerySubtitle}
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2">
        {flowsToRender.map((flow, index) => {
          const { poster } = assetPaths(flow);
          return (
            <motion.button
              key={flow.id}
              type="button"
              onClick={() => setActiveFlow(flow)}
              initial={initial}
              whileInView={whileInView}
              viewport={{ once: true, amount: 0.4 }}
              whileHover={whileHover}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-atlas-soft"
            >
              <div className="relative aspect-video w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={poster}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-cover"
                />
                <span
                  className="absolute inset-0 flex items-center justify-center bg-ink/20 transition-colors group-hover:bg-ink/30"
                  style={{ color: flow.accent }}
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface/90 text-ink shadow-atlas">
                    <AtlasIcon name="play" className="h-7 w-7" />
                  </span>
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-ink">{flow.title}</h3>
                <p className="mt-2 text-sm text-ink-soft">{flow.subtitle}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <Dialog open={activeFlow !== null} onOpenChange={(open) => !open && setActiveFlow(null)}>
        <DialogContent className="max-w-3xl border-line bg-surface p-0 sm:rounded-2xl">
          {activeFlow ? (
            <div>
              <DialogTitle className="sr-only">{activeFlow.title}</DialogTitle>
              <video
                controls
                autoPlay
                className="w-full rounded-t-2xl"
                src={assetPaths(activeFlow).video}
                poster={assetPaths(activeFlow).poster}
              >
                <track kind="captions" />
              </video>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-ink">{activeFlow.title}</h3>
                <p className="mt-2 text-sm text-ink-soft">{activeFlow.subtitle}</p>
                <p className="mt-1 text-xs text-muted">{activeFlow.audience}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
