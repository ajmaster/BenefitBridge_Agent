import type { Language, LocalResource } from "../../lib/types";

const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY ?? "";
const mapsEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_MAPS_EMBED === "true";

export const canRenderMapsEmbed = mapsEnabled && mapsKey.length > 0;

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
    resource.maps_url ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
  );
}

export function googleMapsEmbedUrl(query: string, language: Language): string | null {
  if (!canRenderMapsEmbed) return null;
  const params = new URLSearchParams({
    key: mapsKey,
    q: query,
    language,
  });
  return `https://www.google.com/maps/embed/v1/search?${params.toString()}`;
}
