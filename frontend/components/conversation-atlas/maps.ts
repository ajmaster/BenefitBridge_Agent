import type { Language, LocalResource } from "../../lib/types";

const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY ?? "";
const mapsEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_MAPS_EMBED === "true";
const mapsAllowedOrigins =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_ALLOWED_ORIGINS ?? "";

export type MapsEmbedUnavailableReason =
  | "disabled"
  | "missing_key"
  | "origin_unknown"
  | "origin_not_allowed"
  | "local_origin_unlisted";

export type MapsEmbedAvailability =
  | {
      enabled: true;
      reason: "ready";
      allowedOrigins: string[];
      origin?: string;
    }
  | {
      enabled: false;
      reason: MapsEmbedUnavailableReason;
      allowedOrigins: string[];
      origin?: string;
    };

function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function configuredAllowedOrigins(): string[] {
  return mapsAllowedOrigins
    .split(",")
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin));
}

function isLocalBrowserOrigin(origin: string): boolean {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export const canRenderMapsEmbed = mapsEnabled && mapsKey.length > 0;

export function mapsEmbedAvailability(origin?: string | null): MapsEmbedAvailability {
  const allowedOrigins = configuredAllowedOrigins();
  const normalizedOrigin = origin ? normalizeOrigin(origin) : null;

  if (!mapsEnabled) {
    return { enabled: false, reason: "disabled", allowedOrigins };
  }

  if (mapsKey.length === 0) {
    return { enabled: false, reason: "missing_key", allowedOrigins };
  }

  if (allowedOrigins.length > 0) {
    if (!normalizedOrigin) {
      return { enabled: false, reason: "origin_unknown", allowedOrigins };
    }

    if (!allowedOrigins.includes(normalizedOrigin)) {
      return {
        enabled: false,
        reason: "origin_not_allowed",
        allowedOrigins,
        origin: normalizedOrigin,
      };
    }

    return {
      enabled: true,
      reason: "ready",
      allowedOrigins,
      origin: normalizedOrigin,
    };
  }

  if (normalizedOrigin && isLocalBrowserOrigin(normalizedOrigin)) {
    return {
      enabled: false,
      reason: "local_origin_unlisted",
      allowedOrigins,
      origin: normalizedOrigin,
    };
  }

  return {
    enabled: true,
    reason: "ready",
    allowedOrigins,
    origin: normalizedOrigin ?? undefined,
  };
}

export function resourceMapQuery(resource: LocalResource): string {
  return (
    resource.map_query ??
    [resource.organization, resource.service_name, resource.jurisdiction]
      .filter(Boolean)
      .join(" ")
  );
}

export function googleMapsSearchUrl(resource: LocalResource): string {
  const query = resourceMapQuery(resource);
  return (
    resource.maps_enrichment?.google_maps_uri ??
    resource.maps_url ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
  );
}

export function googleMapsEmbedUrl(
  query: string,
  language: Language,
  origin?: string | null,
): string | null {
  if (!mapsEmbedAvailability(origin).enabled) return null;
  const params = new URLSearchParams({
    key: mapsKey,
    q: query,
    language,
  });
  return `https://www.google.com/maps/embed/v1/search?${params.toString()}`;
}
