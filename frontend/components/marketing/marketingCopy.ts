import type { Locale } from "@/components/conversation-atlas/i18n";

export type MarketingCopy = {
  heroKicker: string;
  heroHeadline: string;
  heroSubhead: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  howItWorksTitle: string;
  howItWorksSteps: Array<{ icon: string; title: string; body: string }>;
  demoGalleryTitle: string;
  demoGallerySubtitle: string;
  footerTagline: string;
};

const marketingCopy = {
  en: {
    heroKicker: "California benefits, prepared clearly",
    heroHeadline: "Benefits prep, made clear.",
    heroSubhead:
      "Chat through your situation. Get sources, next steps, and a packet ready for your appointment.",
    heroCtaPrimary: "Start the conversation",
    heroCtaSecondary: "Watch a demo",
    howItWorksTitle: "How BenefitBridge works",
    howItWorksSteps: [
      {
        icon: "chat",
        title: "Ask",
        body: "Describe your situation in your own words, in English or Spanish.",
      },
      {
        icon: "source",
        title: "Sources",
        body: "See official programs that may apply, each backed by a citation.",
      },
      {
        icon: "document",
        title: "Packet",
        body: "Leave with a printable packet ready for your appointment.",
      },
      {
        icon: "pin",
        title: "Local resources",
        body: "Find nearby food, shelter, and support services, verified before you go.",
      },
    ],
    demoGalleryTitle: "See it in action",
    demoGallerySubtitle: "Watch real conversations turn into ready-to-use benefit packets.",
    footerTagline: "BenefitBridge helps you prepare - official agencies decide eligibility.",
  },
  es: {
    heroKicker: "Beneficios de California, preparados con claridad",
    heroHeadline: "Preparacion de beneficios, mas clara.",
    heroSubhead:
      "Conversa sobre tu situacion y recibe fuentes, proximos pasos y un paquete listo para tu cita.",
    heroCtaPrimary: "Iniciar la conversacion",
    heroCtaSecondary: "Ver una demostracion",
    howItWorksTitle: "Como funciona BenefitBridge",
    howItWorksSteps: [
      {
        icon: "chat",
        title: "Preguntar",
        body: "Describe tu situacion con tus propias palabras, en ingles o espanol.",
      },
      {
        icon: "source",
        title: "Fuentes",
        body: "Consulta programas oficiales que podrian aplicar, cada uno con su fuente.",
      },
      {
        icon: "document",
        title: "Paquete",
        body: "Sal con un paquete imprimible listo para tu cita.",
      },
      {
        icon: "pin",
        title: "Recursos locales",
        body: "Encuentra comida, refugio y apoyo cercano, verificado antes de ir.",
      },
    ],
    demoGalleryTitle: "Mira como funciona",
    demoGallerySubtitle:
      "Mira como conversaciones reales se convierten en paquetes de beneficios listos para usar.",
    footerTagline: "BenefitBridge te ayuda a prepararte; las agencias oficiales deciden la elegibilidad.",
  },
} satisfies Record<Locale, MarketingCopy>;

export function marketingCopyFor(locale: Locale): MarketingCopy {
  return marketingCopy[locale];
}
