"use client";

import { useSyncExternalStore } from "react";
import AtlasIcon from "@/components/workspace/icons/AtlasIcon";
import type { copyFor, Locale } from "@/components/conversation-atlas/i18n";
import {
  googleMapsEmbedUrl,
  googleMapsSearchUrl,
  type MapsEmbedAvailability,
  mapsEmbedAvailability,
  resourceMapQuery,
} from "@/components/conversation-atlas/maps";
import { fallbackResources } from "@/components/conversation-atlas/useBenefitBridgeController";
import californiaCountiesJson from "@/data/californiaCounties.json";
import type { CaliforniaCountySummary, LocalResource } from "@/lib/types";
import { CaliforniaCountyPins } from "./CaliforniaCountyPins";

// Ported from `MapEmbedPanel` in `frontend/components/BenefitBridgeDashboard.tsx`
// (source lines 837-886; `.mapEmbedPanel`/`.mapFallback`/`.resultCardHeader`/`.cardLink`
// styling from `frontend/components/conversation-atlas/ConversationAtlas.module.css`).
// Prop-based in the source (received `resources`/`copy`/`locale`/`testId`/`fallbackTestId`)
// and kept prop-based here.
// Map helpers stay centralized in `frontend/components/conversation-atlas/maps.ts`.
//
// data-testid: `map-panel` (the default `testId`) lives on the root <article> (source line
// 855: `data-testid={testId}` with `testId = "map-panel"` default, source line 841). Its
// fallback counterpart, `map-fallback` (the default `fallbackTestId`), lives on the fallback
// <div> rendered when `googleMapsEmbedUrl` returns null - i.e. Maps Embed isn't enabled
// (source line 869: `data-testid={fallbackTestId}` with `fallbackTestId = "map-fallback"`
// default, source line 842). Both testIds are overridable via props, exactly as the source
// let `ResourcesPanel` override them to resource-specific test IDs (source lines
// 771-772).

type AtlasCopy = ReturnType<typeof copyFor>;
const californiaCounties = californiaCountiesJson as CaliforniaCountySummary[];

function subscribeToOriginChanges() {
  return () => {};
}

function getBrowserOrigin() {
  return typeof window === "undefined" ? null : window.location.origin;
}

function getServerOrigin() {
  return null;
}

export function MapEmbedPanel({
  resources,
  copy,
  locale,
  testId = "map-panel",
  fallbackTestId = "map-fallback",
}: {
  resources: LocalResource[];
  copy: AtlasCopy;
  locale: Locale;
  testId?: string;
  fallbackTestId?: string;
}) {
  const browserOrigin = useSyncExternalStore(
    subscribeToOriginChanges,
    getBrowserOrigin,
    getServerOrigin,
  );
  const primaryResource = resources[0] ?? fallbackResources[0];
  const query = resourceMapQuery(primaryResource);
  const availability = browserOrigin
    ? mapsEmbedAvailability(browserOrigin)
    : ({
        enabled: false,
        reason: "origin_unknown",
        allowedOrigins: [],
      } satisfies MapsEmbedAvailability);
  const embedUrl = browserOrigin ? googleMapsEmbedUrl(query, locale, browserOrigin) : null;
  const selectedCounty = findCountyForResource(primaryResource);
  const fallbackText =
    availability.reason === "origin_not_allowed" ||
    availability.reason === "local_origin_unlisted"
      ? copy.mapEmbedOriginMismatch
      : copy.mapFallback;

  return (
    <article
      className="grid min-h-[330px] gap-3 overflow-hidden rounded-lg border border-line bg-surface p-4 shadow-atlas-soft transition hover:border-line-strong hover:shadow-atlas"
      data-testid={testId}
    >
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-sm text-ink-soft">{copy.mapPreview}</span>
        <strong className="text-xs font-extrabold text-green-dark">
          {availability.enabled ? "Embed" : "Fallback"}
        </strong>
      </div>
      {embedUrl ? (
        <iframe
          className="min-h-[320px] w-full rounded-lg border-0"
          title={copy.mapIframeTitle}
          src={embedUrl}
          loading="lazy"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div
          className="relative grid min-h-[300px] gap-2.5 overflow-hidden rounded-lg border border-line bg-sky bg-[url('/visuals/california-service-map.svg')] bg-center bg-no-repeat p-4 [background-size:72%_auto]"
          data-testid={fallbackTestId}
        >
          <CaliforniaCountyPins
            counties={selectedCounty ? [selectedCounty] : californiaCounties}
            selectedCountyName={selectedCounty?.name}
            large
          />
          <strong className="relative z-[2] self-end text-lg text-ink">{copy.mapPreview}</strong>
          <p className="relative z-[2] max-w-xl rounded-lg border border-line bg-surface/90 px-3 py-2.5 text-ink-soft">
            {fallbackText}
          </p>
          <a
            className="relative z-[2] mt-3 inline-flex min-h-[42px] w-max items-center gap-3 rounded-lg border border-blue px-3.5 text-sm font-extrabold text-blue"
            href={googleMapsSearchUrl(primaryResource)}
            target="_blank"
            rel="noreferrer"
          >
            {copy.openMaps}
            <AtlasIcon name="external" className="h-4 w-4" />
          </a>
        </div>
      )}
    </article>
  );
}

function findCountyForResource(resource: LocalResource): CaliforniaCountySummary | undefined {
  const haystack = `${resource.jurisdiction} ${resource.map_query ?? ""}`.toLowerCase();
  return californiaCounties.find((county) => {
    const names = [county.name, ...county.aliases, ...county.major_cities];
    return names.some((name) => haystack.includes(name.toLowerCase()));
  });
}
