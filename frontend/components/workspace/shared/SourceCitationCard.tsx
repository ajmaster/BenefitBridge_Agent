import AtlasIcon from "@/components/workspace/icons/AtlasIcon";
import type { copyFor } from "@/components/conversation-atlas/i18n";
import type { SourceCitation } from "@/lib/types";

// Ported from `SourceCitationCard` in `frontend/components/BenefitBridgeDashboard.tsx`
// (source lines 726-754; `.sourceCitationCard`/`.resultCardHeader`/`.mutedText` styling from
// `frontend/components/conversation-atlas/ConversationAtlas.module.css`). Prop-based in the
// source (received `citation`/`validationPass`/`copy` from `SourcesPanel`, itself prop-driven
// from the monolith's top-level controller state) - kept prop-based here. No data-testid was
// present on this component in the source.

type AtlasCopy = ReturnType<typeof copyFor>;

function domainLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SourceCitationCard({
  citation,
  validationPass,
  copy,
}: {
  citation: SourceCitation;
  validationPass: boolean;
  copy: AtlasCopy;
}) {
  return (
    <article className="grid gap-2.5 rounded-lg border border-line bg-surface p-4 shadow-atlas-soft transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-atlas">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <AtlasIcon name="shield" className="h-5 w-5 text-ink-soft" />
          <span className="text-sm text-ink-soft">{citation.agency_owner ?? "Official"} source</span>
        </div>
        <strong className="text-xs font-extrabold text-green-dark">
          {validationPass ? copy.verified : copy.review}
        </strong>
      </div>
      <h3 className="text-base font-semibold text-ink">{citation.source_title ?? citation.source_id}</h3>
      <p className="text-sm text-muted">
        {citation.source_type?.replaceAll("_", " ") ?? "Official program reference"}
      </p>
      {citation.url ? (
        <a
          className="inline-flex items-center gap-2 text-sm font-bold text-blue"
          href={citation.url}
          target="_blank"
          rel="noreferrer"
        >
          {domainLabel(citation.url)}
          <AtlasIcon name="external" className="h-4 w-4" />
        </a>
      ) : (
        <span className="text-sm text-muted">{copy.noUrl}</span>
      )}
    </article>
  );
}
