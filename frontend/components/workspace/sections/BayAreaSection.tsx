"use client";

import { copyFor, needLabels } from "@/components/conversation-atlas/i18n";
import { useBenefitBridgeContext } from "@/components/workspace/BenefitBridgeContext";
import { BayAreaPins } from "@/components/workspace/shared/BayAreaPins";
import { MapEmbedPanel } from "@/components/workspace/shared/MapEmbedPanel";

// Section body ported from `BayAreaPanel` in
// `frontend/components/BenefitBridgeDashboard.tsx` (source lines 947-987): a large,
// location-highlighted `BayAreaPins` map, a summary card (needs selected, resources
// loaded, boundary reminder), and a standard `MapEmbedPanel`.

export function BayAreaSection() {
  const { snapshot, displayResources } = useBenefitBridgeContext();
  const locale = snapshot.language;
  const copy = copyFor(locale);

  return (
    <div className="grid gap-6">
      <div>
        <span className="text-sm font-semibold text-ink-soft">{copy.sections["bay-area"]}</span>
        <h1 className="text-2xl font-semibold text-ink">{copy.sectionCopy["bay-area"].title}</h1>
        <p className="mt-1 text-muted">{copy.sectionCopy["bay-area"].body}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <div
          className="relative min-h-[420px] overflow-hidden rounded-lg border border-line bg-sky bg-[url('/visuals/california-service-map.svg')] bg-center bg-no-repeat p-4 [background-size:80%_auto]"
          aria-label="Simplified Bay Area service map"
        >
          <BayAreaPins locationText={snapshot.location_text} large />
        </div>

        <div className="grid gap-2.5 rounded-lg border border-line bg-surface p-4 shadow-atlas-soft">
          <h3 className="text-lg font-semibold text-ink">{snapshot.location_text || "Bay Area"}</h3>
          <p className="text-muted">{copy.bayBody}</p>
          <dl className="mt-2 grid gap-2">
            <div className="border-t border-line pt-2">
              <dt className="text-xs font-extrabold text-muted">{copy.needsSelected}</dt>
              <dd className="mt-1 font-extrabold text-ink">
                {snapshot.needs.map((need) => needLabels[locale][need] ?? need).join(", ") ||
                  copy.noneSelected}
              </dd>
            </div>
            <div className="border-t border-line pt-2">
              <dt className="text-xs font-extrabold text-muted">{copy.loadedResources}</dt>
              <dd className="mt-1 font-extrabold text-ink">{displayResources.length}</dd>
            </div>
            <div className="border-t border-line pt-2">
              <dt className="text-xs font-extrabold text-muted">{copy.reminder}</dt>
              <dd className="mt-1 font-extrabold text-ink">{copy.boundary[3]}</dd>
            </div>
          </dl>
        </div>

        <div className="lg:col-span-2">
          <MapEmbedPanel resources={displayResources} copy={copy} locale={locale} />
        </div>
      </div>
    </div>
  );
}
