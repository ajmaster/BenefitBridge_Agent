// Ported from `BayAreaPins` in `frontend/components/BenefitBridgeDashboard.tsx`
// (source lines 1116-1148; `.pinLayer`/`.pinLayerLarge`/`.mapPin`/`.mapPinActive` styling
// from `frontend/components/conversation-atlas/ConversationAtlas.module.css`). Prop-based in
// the source (received `locationText`/`large` from callers throughout the monolith) - kept
// prop-based here.

const pins = [
  { city: "San Francisco", top: "36%", left: "26%" },
  { city: "Oakland", top: "42%", left: "50%" },
  { city: "Hayward", top: "55%", left: "55%" },
  { city: "Fremont", top: "65%", left: "68%" },
  { city: "San Jose", top: "78%", left: "58%" },
];

export function BayAreaPins({
  locationText,
  large = false,
}: {
  locationText: string;
  large?: boolean;
}) {
  const selected = locationText.toLowerCase();

  return (
    <div className={large ? "relative min-h-[420px]" : "absolute inset-0"} aria-hidden="true">
      {pins.map((pin) => {
        const active = selected.includes(pin.city.toLowerCase().split(" ")[0]);
        return (
          <span
            key={pin.city}
            className={
              active
                ? "absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-blue bg-blue px-3 py-1.5 text-xs font-extrabold text-white shadow-atlas-soft before:absolute before:-top-[15px] before:left-1/2 before:h-3.5 before:w-3.5 before:-translate-x-1/2 before:rounded-full before:border-2 before:border-surface before:bg-blue before:content-['']"
                : "absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-blue/40 bg-sky px-3 py-1.5 text-xs font-extrabold text-blue-dark shadow-atlas-soft before:absolute before:-top-[15px] before:left-1/2 before:h-3.5 before:w-3.5 before:-translate-x-1/2 before:rounded-full before:border-2 before:border-surface before:bg-blue before:content-['']"
            }
            style={{ top: pin.top, left: pin.left }}
          >
            {pin.city}
          </span>
        );
      })}
    </div>
  );
}
