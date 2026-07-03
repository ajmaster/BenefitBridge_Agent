import type { Locale } from "@/components/conversation-atlas/i18n";

export type MarketingCopy = {
  heroKicker: string;
  heroHeadline: string;
  heroSubhead: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  heroCapabilities: Array<{ icon: string; label: string }>;
  howItWorksTitle: string;
  howItWorksSteps: Array<{ icon: string; title: string; body: string }>;
  demoGalleryTitle: string;
  demoGallerySubtitle: string;
  footerTagline: string;
};

const marketingCopy = {
  en: {
    heroKicker: "Voice, maps, reminders, and benefits prep",
    heroHeadline: "Ask AidAtlasCA. Find help nearby.",
    heroSubhead:
      "Speak or type in English or Spanish. AidAtlasCA uses official sources, safe Google Maps handoffs, calendar reminders, and prep documents to help you get ready.",
    heroCtaPrimary: "Ask AidAtlasCA",
    heroCtaSecondary: "Watch voice + maps",
    heroCapabilities: [
      { icon: "mic", label: "Voice agent" },
      { icon: "map", label: "Maps" },
      { icon: "places", label: "Places handoffs" },
      { icon: "language", label: "English / Spanish" },
      { icon: "calendar", label: "Calendar reminders" },
    ],
    howItWorksTitle: "How AidAtlasCA works",
    howItWorksSteps: [
      {
        icon: "mic",
        title: "Talk or type",
        body: "Use the persistent agent in English or Spanish without sharing private IDs.",
      },
      {
        icon: "map",
        title: "Use safe maps",
        body: "View Google Maps links or embeds for curated resource areas, then call before going.",
      },
      {
        icon: "places",
        title: "Compare local places",
        body: "See source-backed local handoffs without exact-address routing or live availability claims.",
      },
      {
        icon: "calendar",
        title: "Schedule reminders",
        body: "Create calendar reminders for calls, appointments, and documents to gather.",
      },
      {
        icon: "source",
        title: "Leave prepared",
        body: "Review source-backed prep documents after the agent organizes the next steps.",
      },
    ],
    demoGalleryTitle: "See it in action",
    demoGallerySubtitle:
      "Watch the agent move from voice or chat to maps, reminders, sources, and prep documents.",
    footerTagline: "AidAtlasCA helps you prepare - official agencies decide eligibility.",
  },
  es: {
    heroKicker: "Voz, mapas, recordatorios y preparacion",
    heroHeadline: "Pregunta a AidAtlasCA. Encuentra ayuda cercana.",
    heroSubhead:
      "Habla o escribe en ingles o espanol. AidAtlasCA usa fuentes oficiales, enlaces seguros de Google Maps, recordatorios de calendario y documentos de preparacion.",
    heroCtaPrimary: "Preguntar a AidAtlasCA",
    heroCtaSecondary: "Ver voz + mapas",
    heroCapabilities: [
      { icon: "mic", label: "Agente de voz" },
      { icon: "map", label: "Mapas" },
      { icon: "places", label: "Recursos locales" },
      { icon: "language", label: "Ingles / espanol" },
      { icon: "calendar", label: "Recordatorios" },
    ],
    howItWorksTitle: "Como funciona AidAtlasCA",
    howItWorksSteps: [
      {
        icon: "mic",
        title: "Habla o escribe",
        body: "Usa el agente en ingles o espanol sin compartir IDs privados.",
      },
      {
        icon: "map",
        title: "Usa mapas seguros",
        body: "Usa enlaces o vistas de Google Maps para areas de recursos revisadas y llama antes de ir.",
      },
      {
        icon: "places",
        title: "Compara recursos locales",
        body: "Ve recursos con fuentes sin rutas por direccion exacta ni promesas de disponibilidad.",
      },
      {
        icon: "calendar",
        title: "Agenda recordatorios",
        body: "Crea recordatorios de calendario para llamadas, citas y documentos.",
      },
      {
        icon: "source",
        title: "Sal preparado",
        body: "Revisa documentos con fuentes despues de que el agente organiza los pasos.",
      },
    ],
    demoGalleryTitle: "Mira como funciona",
    demoGallerySubtitle:
      "Mira como el agente pasa de voz o chat a mapas, recordatorios, fuentes y documentos.",
    footerTagline: "AidAtlasCA te ayuda a prepararte; las agencias oficiales deciden la elegibilidad.",
  },
} satisfies Record<Locale, MarketingCopy>;

export function marketingCopyFor(locale: Locale): MarketingCopy {
  return marketingCopy[locale];
}
