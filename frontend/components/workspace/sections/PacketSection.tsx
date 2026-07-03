"use client";

import type { ReactNode } from "react";
import AtlasIcon, { type AtlasIconName } from "@/components/workspace/icons/AtlasIcon";
import { copyFor } from "@/components/conversation-atlas/i18n";
import { useBenefitBridgeContext } from "@/components/workspace/BenefitBridgeContext";
import { BoundaryList } from "@/components/workspace/shared/BoundaryList";
import type { LocalResource, PrepPacket, SourceCitation } from "@/lib/types";

export function PacketSection() {
  const {
    packet,
    result,
    busy,
    snapshot,
    displayResources,
    runTranslate,
    runDownloadCalendar,
    runPrintPacket,
    runCopyCallScript,
    runDownloadMarkdown,
  } = useBenefitBridgeContext();
  const copy = copyFor(snapshot.language);

  if (!packet) {
    return (
      <div className="rounded-lg border border-line bg-surface p-6 shadow-atlas-soft">
        <p className="text-muted">{copy.noPacket}</p>
      </div>
    );
  }

  const citations = dedupeCitations(packet);

  return (
    <div className="grid min-w-0 gap-6" data-testid="packet-panel">
      <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-atlas-soft">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
          <div className="min-w-0">
            <span className="text-sm font-semibold uppercase tracking-wide text-green-dark">
              {copy.packetHeroKicker}
            </span>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              {copy.packetHeroTitle}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
              {copy.packetHeroBody}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-green bg-green-soft px-3 py-1 text-xs font-semibold text-green-dark">
                {copy.sourceBacked}
              </span>
              <span className="rounded-full border border-line bg-sky px-3 py-1 text-xs font-semibold text-ink-soft">
                {copy.routeLabel}: {result.route.replaceAll("_", " ")}
              </span>
            </div>
          </div>

          <DocumentKitDiagram copy={copy} />
        </div>
      </section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="grid min-w-0 gap-4">
          <div className="rounded-lg border border-line bg-surface p-4 shadow-atlas-soft">
            <h2 className="text-xl font-semibold text-ink">{copy.documentKitTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-muted">{copy.documentKitBody}</p>
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <DocumentCard
              icon="document"
              title={copy.onePageSummary}
              tone="blue"
              body={packet.household_snapshot_summary}
            >
              <div className="grid gap-2">
                {packet.potential_benefit_paths.slice(0, 4).map((path) => (
                  <div key={path.program_name} className="rounded-lg border border-line p-3">
                    <div className="font-semibold text-ink">{path.program_name}</div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-green-dark">
                      {path.status_label.replaceAll("_", " ")}
                    </div>
                    {path.why_this_is_relevant.length > 0 && (
                      <p className="mt-2 text-sm leading-6 text-ink-soft">
                        {path.why_this_is_relevant.slice(0, 2).join(" ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </DocumentCard>

            <DocumentCard icon="check" title={copy.documentsToBring} tone="green">
              <BulletList items={packet.document_checklist} emptyLabel={copy.noItemsYet} />
            </DocumentCard>

            <DocumentCard icon="chat" title={copy.questionsToAsk} tone="orange">
              <BulletList items={packet.caseworker_questions} emptyLabel={copy.noItemsYet} />
            </DocumentCard>

            <DocumentCard icon="prepare" title={copy.callScriptDoc} tone="sky">
              <div className="rounded-lg border border-line bg-sky p-4">
                <p className="text-sm leading-6 text-ink-soft">{packet.call_script}</p>
              </div>
            </DocumentCard>

            <DocumentCard icon="map" title={copy.localHandoffs} tone="green">
              {displayResources.length > 0 ? (
                <div className="grid gap-3">
                  {displayResources.slice(0, 5).map((resource) => (
                    <LocalHandoff key={resource.id} resource={resource} copy={copy} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">{copy.noLocalHandoffs}</p>
              )}
            </DocumentCard>

            <DocumentCard icon="source" title={copy.officialSourceSheet} tone="blue">
              {citations.length > 0 ? (
                <div className="grid gap-3">
                  {citations.slice(0, 8).map((citation) => (
                    <SourceRow
                      key={citation.source_id || citation.url}
                      citation={citation}
                      copy={copy}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">{copy.noSources}</p>
              )}
            </DocumentCard>
          </div>
        </section>

        <aside className="grid min-w-0 gap-4 content-start rounded-lg border border-line bg-surface p-4 shadow-atlas-soft">
          <div>
            <h3 className="text-lg font-semibold text-ink">{copy.packetActions}</h3>
            <p className="mt-1 text-sm leading-6 text-muted">{copy.packetActionsBody}</p>
          </div>
          <button
            type="button"
            onClick={runPrintPacket}
            disabled={busy}
            data-testid="print-packet-button"
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <AtlasIcon name="document" className="h-4 w-4" />
            <span>{copy.printSavePdf}</span>
          </button>
          <button
            type="button"
            onClick={runCopyCallScript}
            disabled={busy}
            data-testid="copy-call-script-button"
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-blue px-4 py-2 text-sm font-semibold text-blue disabled:opacity-50"
          >
            <AtlasIcon name="chat" className="h-4 w-4" />
            <span>{copy.copyCallScript}</span>
          </button>
          <button
            type="button"
            onClick={runDownloadCalendar}
            disabled={busy}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink-soft disabled:opacity-50"
          >
            <AtlasIcon name="arrow" className="h-4 w-4" />
            <span>{copy.downloadCalendar}</span>
          </button>
          <details className="rounded-lg border border-line">
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-ink">
              {copy.advanced}
            </summary>
            <div className="grid gap-2 border-t border-line p-3">
              <button
                type="button"
                onClick={runTranslate}
                disabled={busy}
                className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink-soft disabled:opacity-50"
              >
                <AtlasIcon name="globe" className="h-4 w-4" />
                <span>{copy.translatePacket}</span>
              </button>
              <button
                type="button"
                onClick={runDownloadMarkdown}
                disabled={busy}
                data-testid="download-markdown-button"
                className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink-soft disabled:opacity-50"
              >
                <AtlasIcon name="document" className="h-4 w-4" />
                <span>{copy.downloadMarkdown}</span>
              </button>
            </div>
          </details>
          <BoundaryList copy={copy.boundary} compact />
        </aside>
      </div>
    </div>
  );
}

function DocumentCard({
  icon,
  title,
  tone,
  body,
  children,
}: {
  icon: AtlasIconName;
  title: string;
  tone: "blue" | "green" | "orange" | "sky";
  body?: string;
  children?: ReactNode;
}) {
  const toneClass = {
    blue: "bg-sky text-blue",
    green: "bg-green-soft text-green-dark",
    orange: "bg-orange-soft text-orange",
    sky: "bg-sky text-ink",
  }[tone];

  return (
    <article
      className="grid min-w-0 gap-3 rounded-lg border border-line bg-surface p-4 shadow-atlas-soft"
      data-testid="document-card"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
          <AtlasIcon name={icon} className="h-5 w-5" />
        </span>
        <h3 className="min-w-0 text-lg font-semibold text-ink">{title}</h3>
      </div>
      {body && <p className="text-sm leading-6 text-muted">{body}</p>}
      {children}
    </article>
  );
}

function BulletList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">{emptyLabel}</p>;
  }
  return (
    <ul className="grid gap-2">
      {items.slice(0, 10).map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-6 text-ink-soft">
          <AtlasIcon name="check" className="mt-1 h-4 w-4 shrink-0 text-green-dark" />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function LocalHandoff({
  resource,
  copy,
}: {
  resource: LocalResource;
  copy: ReturnType<typeof copyFor>;
}) {
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="font-semibold text-ink">{resource.organization}</div>
      <div className="text-sm text-muted">{resource.service_name}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="rounded-full bg-sky px-2.5 py-1 text-xs font-semibold text-ink-soft">
          {resource.jurisdiction}
        </span>
        {resource.phone && (
          <span className="rounded-full bg-green-soft px-2.5 py-1 text-xs font-semibold text-green-dark">
            {copy.phone}: {resource.phone}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        {resource.availability_notice || copy.boundary[3]}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {resource.url && (
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue"
          >
            {copy.openResource}
            <AtlasIcon name="external" className="h-3.5 w-3.5" />
          </a>
        )}
        {resource.maps_url && (
          <a
            href={resource.maps_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-blue"
          >
            {copy.openMaps}
            <AtlasIcon name="external" className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function SourceRow({
  citation,
  copy,
}: {
  citation: SourceCitation;
  copy: ReturnType<typeof copyFor>;
}) {
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="font-semibold text-ink">
        {citation.source_title || citation.source_id}
      </div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {citation.agency_owner || citation.source_type || citation.freshness_state || "source"}
      </div>
      {citation.url && (
        <a
          href={citation.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue"
        >
          {copy.openSource}
          <AtlasIcon name="external" className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

function DocumentKitDiagram({ copy }: { copy: ReturnType<typeof copyFor> }) {
  const steps: Array<{ label: string; icon: AtlasIconName }> = [
    { label: copy.documentFlowAsk, icon: "chat" },
    { label: copy.documentFlowSources, icon: "source" },
    { label: copy.documentFlowKit, icon: "document" },
  ];

  return (
    <div className="rounded-lg border border-line bg-sky p-4">
      <div className="grid gap-3">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-blue">
              <AtlasIcon name={step.icon} className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                0{index + 1}
              </div>
              <div className="text-sm font-semibold text-ink">{step.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function dedupeCitations(packet: PrepPacket) {
  const seen = new Set<string>();
  const citations = [
    ...packet.source_citations,
    ...packet.potential_benefit_paths.flatMap((path) => path.source_citations),
  ];
  return citations.filter((citation) => {
    const key = citation.source_id || citation.url;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
