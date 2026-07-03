"use client";

import { useMemo, useState } from "react";

import { copyFor } from "@/components/conversation-atlas/i18n";
import { useBenefitBridgeContext } from "@/components/workspace/BenefitBridgeContext";
import AtlasIcon from "@/components/workspace/icons/AtlasIcon";
import { SourceCitationCard } from "@/components/workspace/shared/SourceCitationCard";
import approvedSourcesJson from "@/data/approvedSources.json";
import type { ApprovedSourceMetadata, SourceCitation } from "@/lib/types";

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

const approvedSources = approvedSourcesJson as ApprovedSourceMetadata[];

function domainLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function sourceSearchText(source: ApprovedSourceMetadata) {
  return [
    source.id,
    source.name,
    source.url,
    source.jurisdiction,
    source.level,
    source.owner_type,
    source.integration,
    ...(source.category ?? []),
    ...(source.use_for ?? []),
    ...(source.safe_claims ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function ApprovedSourceCard({
  source,
  copy,
}: {
  source: ApprovedSourceMetadata;
  copy: ReturnType<typeof copyFor>;
}) {
  const categories = source.category?.slice(0, 2) ?? [];

  return (
    <article className="grid min-w-0 gap-2.5 rounded-lg border border-line bg-surface p-4 shadow-atlas-soft transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-atlas">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <AtlasIcon name="source" className="h-5 w-5 shrink-0 text-ink-soft" />
          <span className="min-w-0 truncate text-sm text-ink-soft">
            {source.owner_type?.replaceAll("_", " ") ?? copy.officialSource}
          </span>
        </div>
        <strong className="shrink-0 text-xs font-extrabold text-green-dark">
          {source.last_checked ?? copy.review}
        </strong>
      </div>
      <h3 className="text-base font-semibold text-ink">{source.name}</h3>
      <p className="text-sm text-muted">
        {[source.jurisdiction, source.level, ...categories]
          .filter(Boolean)
          .join(" / ") || source.id}
      </p>
      {source.use_for?.[0] && (
        <p className="line-clamp-2 text-sm leading-6 text-ink-soft">{source.use_for[0]}</p>
      )}
      {source.url ? (
        <a
          className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-blue"
          href={source.url}
          target="_blank"
          rel="noreferrer"
        >
          <span className="truncate">{domainLabel(source.url)}</span>
          <AtlasIcon name="external" className="h-4 w-4 shrink-0" />
        </a>
      ) : (
        <span className="text-sm text-muted">{copy.noUrl}</span>
      )}
    </article>
  );
}

export function SourcesSection() {
  const { packet, snapshot, validationPass } = useBenefitBridgeContext();
  const copy = copyFor(snapshot.language);
  const [sourceQuery, setSourceQuery] = useState("");

  const citations = uniqueCitations([
    ...(packet?.source_citations ?? []),
    ...(packet?.potential_benefit_paths.flatMap((path) => path.source_citations) ?? []),
  ]);
  const filteredSources = useMemo(() => {
    const terms = sourceQuery
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (terms.length === 0) return approvedSources;
    return approvedSources.filter((source) => {
      const haystack = sourceSearchText(source);
      return terms.every((term) => haystack.includes(term));
    });
  }, [sourceQuery]);

  return (
    <div className="grid gap-6">
      <div>
        <span className="text-sm font-semibold text-ink-soft">{copy.sections.sources}</span>
        <h1 className="text-2xl font-semibold text-ink">{copy.sectionCopy.sources.title}</h1>
        <p className="mt-1 text-muted">{copy.sectionCopy.sources.body}</p>
      </div>

      <section className="grid gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">{copy.sourceTrail}</h2>
          <p className="mt-1 text-sm text-muted">{copy.sourceTrailBody}</p>
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
      </section>

      <section className="grid gap-3">
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-atlas-soft md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">{copy.sourceLibrary}</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted">{copy.sourceLibraryBody}</p>
          </div>
          <div className="grid min-w-0 gap-1 md:w-80">
            <label className="text-xs font-bold uppercase tracking-wide text-ink-soft" htmlFor="source-library-search">
              {copy.sourceLibrarySearch}
            </label>
            <input
              id="source-library-search"
              value={sourceQuery}
              onChange={(event) => setSourceQuery(event.target.value)}
              placeholder={copy.sourceLibrarySearchPlaceholder}
              className="min-h-10 rounded-lg border border-line bg-surface px-3 text-sm text-ink"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink-soft">
            {filteredSources.length} / {approvedSources.length} {copy.sourceLibraryCount}
          </p>
        </div>
        {filteredSources.length > 0 ? (
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredSources.map((source) => (
              <ApprovedSourceCard key={source.id} source={source} copy={copy} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-line bg-surface p-4 text-sm text-muted">
            {copy.noSourceMatches}
          </p>
        )}
      </section>
    </div>
  );
}
