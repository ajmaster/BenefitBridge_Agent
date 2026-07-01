"use client";

import { copyFor } from "@/components/conversation-atlas/i18n";
import { useBenefitBridgeContext } from "@/components/workspace/BenefitBridgeContext";
import { MapEmbedPanel } from "@/components/workspace/shared/MapEmbedPanel";
import { ResourceCard } from "@/components/workspace/shared/ResourceCard";

// Section body ported from `ResourcesPanel` in
// `frontend/components/BenefitBridgeDashboard.tsx` (source lines 756-781: a map preview
// followed by a two-column grid of `ResourceCard`s). The source overrode the map testids to
// `bay-map-panel`/`bay-map-fallback` here; that override is preserved.

export function ResourcesSection() {
  const { snapshot, displayResources } = useBenefitBridgeContext();
  const locale = snapshot.language;
  const copy = copyFor(locale);

  return (
    <div className="grid gap-6">
      <div>
        <span className="text-sm font-semibold text-ink-soft">{copy.sections.resources}</span>
        <h1 className="text-2xl font-semibold text-ink">{copy.sectionCopy.resources.title}</h1>
        <p className="mt-1 text-muted">{copy.sectionCopy.resources.body}</p>
      </div>

      <div className="grid gap-3.5">
        <MapEmbedPanel
          resources={displayResources}
          copy={copy}
          locale={locale}
          testId="bay-map-panel"
          fallbackTestId="bay-map-fallback"
        />
        <div className="grid gap-3.5 sm:grid-cols-2">
          {displayResources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} copy={copy} />
          ))}
        </div>
      </div>
    </div>
  );
}
