"use client";

import { copyFor } from "@/components/conversation-atlas/i18n";
import { useBenefitBridgeContext } from "@/components/workspace/BenefitBridgeContext";
import { SourceCitationCard } from "@/components/workspace/shared/SourceCitationCard";
import type { SourceCitation } from "@/lib/types";

// Section body ported from `SourcesPanel` in
// `frontend/components/BenefitBridgeDashboard.tsx` (source lines 698-724: the deduped,
// 8-item-capped citation grid) plus the private `uniqueCitations` helper (source lines
// 1279-1287), reproduced locally since it was not extracted as a shared export.

function uniqueCitations(citations: SourceCitation[]) {
  const seen = new Set<string>();
  return citations.filter((citation) => {
    const key = `${citation.source_id}-${citation.url ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function SourcesSection() {
  const { packet, snapshot, validationPass } = useBenefitBridgeContext();
  const copy = copyFor(snapshot.language);

  const citations = uniqueCitations([
    ...(packet?.source_citations ?? []),
    ...(packet?.potential_benefit_paths.flatMap((path) => path.source_citations) ?? []),
  ]).slice(0, 8);

  return (
    <div className="grid gap-6">
      <div>
        <span className="text-sm font-semibold text-ink-soft">{copy.sections.sources}</span>
        <h1 className="text-2xl font-semibold text-ink">{copy.sectionCopy.sources.title}</h1>
        <p className="mt-1 text-muted">{copy.sectionCopy.sources.body}</p>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {citations.map((citation) => (
          <SourceCitationCard
            key={`${citation.source_id}-${citation.url ?? citation.source_title}`}
            citation={citation}
            validationPass={validationPass}
            copy={copy}
          />
        ))}
      </div>
    </div>
  );
}
