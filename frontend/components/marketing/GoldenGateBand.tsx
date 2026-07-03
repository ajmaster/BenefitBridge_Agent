import type { Locale } from "@/components/conversation-atlas/i18n";

const copy = {
  en: {
    title: "California navigation, Bay Area clarity.",
    body: "AidAtlasCA starts with broad city, county, or ZIP details and keeps local handoffs source-backed.",
  },
  es: {
    title: "Navegacion de California, claridad local.",
    body: "AidAtlasCA empieza con ciudad, condado o codigo postal y mantiene los recursos con fuentes.",
  },
} satisfies Record<Locale, { title: string; body: string }>;

export function GoldenGateBand({ locale }: { locale: Locale }) {
  const text = copy[locale];

  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-6 pb-16 md:grid-cols-[1fr_1.4fr] md:pb-20">
      <div className="min-w-0">
        <h2 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">{text.title}</h2>
        <p className="mt-3 text-sm leading-6 text-ink-soft md:text-base">{text.body}</p>
      </div>
      <img
        src="/brand/golden-gate-support.png"
        alt=""
        aria-hidden="true"
        className="min-w-0 rounded-xl border border-line bg-surface shadow-atlas-soft"
      />
    </section>
  );
}
