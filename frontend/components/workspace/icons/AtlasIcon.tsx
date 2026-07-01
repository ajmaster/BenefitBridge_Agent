// Ported from `frontend/components/BenefitBridgeDashboard.tsx` (AtlasIconName type, source
// lines 28-42, and the AtlasIcon function, source lines 1173-1277). SVG markup/paths are
// copied verbatim - this is a pure relocation so new marketing/workspace components can
// import the icon set without depending on the monolith BenefitBridgeDashboard.tsx, which
// keeps its own inline copy and is otherwise unaffected by this change.
//
// The only addition vs. the source is an optional `className` prop (the source relied on
// surrounding CSS-module selectors like `.navButton svg` for sizing/color; standalone
// marketing components need to be able to size/color icons directly).
export type AtlasIconName =
  | "arrow"
  | "bay"
  | "chat"
  | "check"
  | "document"
  | "external"
  | "globe"
  | "map"
  | "pin"
  | "play"
  | "prepare"
  | "shield"
  | "source"
  | "user";

export default function AtlasIcon({
  name,
  className,
}: {
  name: AtlasIconName;
  className?: string;
}) {
  switch (name) {
    case "arrow":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <path d="M5 12h13" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );
    case "bay":
    case "map":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Z" />
          <path d="M9 4v14" />
          <path d="M15 6v14" />
        </svg>
      );
    case "chat":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <path d="M5 6h14v9H9l-4 4V6Z" />
          <path d="M8 10h5" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <path d="m6 12 4 4 8-9" />
        </svg>
      );
    case "document":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <path d="M7 3h7l3 3v15H7V3Z" />
          <path d="M14 3v4h4" />
          <path d="M9 11h6" />
          <path d="M9 15h6" />
        </svg>
      );
    case "external":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <path d="M10 6H6v12h12v-4" />
          <path d="M14 6h4v4" />
          <path d="m18 6-8 8" />
        </svg>
      );
    case "globe":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <circle cx="12" cy="12" r="8" />
          <path d="M4 12h16" />
          <path d="M12 4a12 12 0 0 1 0 16" />
          <path d="M12 4a12 12 0 0 0 0 16" />
        </svg>
      );
    case "pin":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <path d="M12 21s7-6.1 7-12a7 7 0 0 0-14 0c0 5.9 7 12 7 12Z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      );
    case "play":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <circle cx="12" cy="12" r="9" />
          <path d="m10 8 6 4-6 4V8Z" />
        </svg>
      );
    case "prepare":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <path d="M8 4h8" />
          <path d="M9 2h6v4H9V2Z" />
          <path d="M6 5h12v16H6V5Z" />
          <path d="m9 13 2 2 4-5" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <path d="M12 3 5 6v5c0 4.6 3 7.8 7 10 4-2.2 7-5.4 7-10V6l-7-3Z" />
          <path d="m9 12 2 2 4-5" />
        </svg>
      );
    case "source":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <path d="M7 4h10v16H7V4Z" />
          <path d="M9 8h6" />
          <path d="M9 12h6" />
          <path d="M9 16h4" />
        </svg>
      );
    case "user":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
          <circle cx="12" cy="8" r="4" />
          <path d="M5 21a7 7 0 0 1 14 0" />
        </svg>
      );
  }
}
