import AtlasIcon from "@/components/workspace/icons/AtlasIcon";
import type { copyFor } from "@/components/conversation-atlas/i18n";
import { fallbackResources } from "@/components/conversation-atlas/useBenefitBridgeController";
import { fallbackResult } from "@/data/syntheticProfiles";
import type { LocalResource, PrepPacket } from "@/lib/types";

// Ported from `AtlasResultStack` in `frontend/components/BenefitBridgeDashboard.tsx`
// (source lines 469-530; `.resultStack`/`.resultCard`/`.sourceCard`/`.resourceCard`/
// `.packetCard` styling from
// `frontend/components/conversation-atlas/ConversationAtlas.module.css`). Renamed
// `ResultStackPreview` per the task brief. Prop-based in the source (received `packet`/
// `resources`/`validationPass`/`copy` from the hero section and the "chat" `SectionFrame` in
// the monolith's top-level controller state) - kept prop-based here.

type AtlasCopy = ReturnType<typeof copyFor>;

function domainLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function ResultStackPreview({
  packet,
  resources,
  validationPass,
  copy,
}: {
  packet?: PrepPacket;
  resources: LocalResource[];
  validationPass: boolean;
  copy: AtlasCopy;
}) {
  const primaryPath = packet?.potential_benefit_paths[0];
  const primaryCitation =
    primaryPath?.source_citations[0] ??
    packet?.source_citations[0] ??
    fallbackResult.packet?.source_citations[0];
  const primaryResource = resources[0] ?? fallbackResources[0];
  const checklist = packet?.document_checklist.slice(0, 5) ?? [];

  return (
    <div className="grid gap-4" aria-label="Source, resource, and packet preview">
      <article className="grid gap-2 rounded-lg border border-[#9edbc5] bg-surface p-4 shadow-atlas-soft">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AtlasIcon name="shield" className="h-5 w-5 text-ink-soft" />
            <span className="text-sm text-ink-soft">{copy.officialSource}</span>
          </div>
          <strong className="text-xs font-extrabold text-green-dark">
            {validationPass ? copy.verified : copy.review}
          </strong>
        </div>
        <h3 className="text-base font-semibold text-ink">{primaryPath?.program_name ?? "BenefitsCal"}</h3>
        <p className="text-sm text-muted">{primaryCitation?.source_title ?? "Official program source"}</p>
        {primaryCitation?.url && (
          <a
            className="inline-flex items-center gap-2 text-sm font-bold text-blue"
            href={primaryCitation.url}
            target="_blank"
            rel="noreferrer"
          >
            {domainLabel(primaryCitation.url)}
            <AtlasIcon name="external" className="h-4 w-4" />
          </a>
        )}
      </article>
      <article className="grid gap-2 rounded-lg border border-[#ffb5aa] bg-surface p-4 shadow-atlas-soft">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AtlasIcon name="pin" className="h-5 w-5 text-ink-soft" />
            <span className="text-sm text-ink-soft">{copy.localResource}</span>
          </div>
          <strong className="text-xs font-extrabold text-green-dark">{copy.callBeforeGoing}</strong>
        </div>
        <h3 className="text-base font-semibold text-ink">{primaryResource.organization}</h3>
        <p className="text-sm text-muted">{primaryResource.service_name}</p>
        {primaryResource.phone && <span className="text-sm text-ink-soft">{primaryResource.phone}</span>}
      </article>
      <article className="grid gap-2 rounded-lg border border-[#ffc64a] bg-surface p-4 shadow-atlas-soft">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AtlasIcon name="document" className="h-5 w-5 text-ink-soft" />
            <span className="text-sm text-ink-soft">{copy.sections.packet}</span>
          </div>
          <strong className="text-xs font-extrabold text-green-dark">{checklist.length} items</strong>
        </div>
        <ul className="grid gap-1.5">
          {checklist.map((item) => (
            <li key={item} className="flex items-center gap-2 text-ink-soft">
              <AtlasIcon name="check" className="h-4 w-4 text-green" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
