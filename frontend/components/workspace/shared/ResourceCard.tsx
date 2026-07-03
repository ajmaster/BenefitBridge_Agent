import AtlasIcon from "@/components/workspace/icons/AtlasIcon";
import type { copyFor } from "@/components/conversation-atlas/i18n";
import { googleMapsSearchUrl } from "@/components/conversation-atlas/maps";
import type { LocalResource } from "@/lib/types";

// Ported from `ResourceCard` in `frontend/components/BenefitBridgeDashboard.tsx`
// (source lines 783-835; `.localResourceCard`/`.resourceIcon`/`.resourceMeta`/`.callNotice`/
// `.resourceActions`/`.cardLink` styling from
// `frontend/components/conversation-atlas/ConversationAtlas.module.css`). Prop-based in the
// source (received `resource`/`copy` from `ResourcesPanel`) - kept prop-based here.
// `googleMapsSearchUrl` is imported unchanged from
// `frontend/components/conversation-atlas/maps.ts`.

type AtlasCopy = ReturnType<typeof copyFor>;

export function ResourceCard({ resource, copy }: { resource: LocalResource; copy: AtlasCopy }) {
  const maps = resource.maps_enrichment;
  const isStatewideLocator = resource.coverage_level === "statewide_locator";
  const coverageLabel =
    resource.coverage_label ??
    (isStatewideLocator ? "Statewide locator handoff" : "Reviewed local resources");

  return (
    <article className="grid grid-cols-[auto_minmax(0,1fr)] gap-3.5 rounded-lg border border-line bg-surface p-4 shadow-atlas-soft transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-atlas">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-soft text-red">
        <AtlasIcon name="pin" className="h-5 w-5" />
      </div>
      <div>
        <div className="flex items-center justify-between gap-2.5">
          <span className="text-sm text-ink-soft">{resource.service_type}</span>
          <strong className="text-xs font-extrabold text-green-dark">
            {resource.call_before_going ? copy.callBeforeGoing : copy.verifyFirst}
          </strong>
        </div>
        <span className="mt-2 inline-flex rounded-md border border-line bg-white px-2 py-1 text-xs font-extrabold text-muted">
          {coverageLabel}
        </span>
        <h3 className="mt-1 text-base font-semibold text-ink">{resource.organization}</h3>
        <p className="text-sm text-muted">{resource.service_name}</p>
        {resource.eligibility_notes && (
          <p className="mt-2 text-sm text-muted">{resource.eligibility_notes}</p>
        )}
        <dl className="mt-3 grid gap-2">
          <div className="border-t border-line pt-2">
            <dt className="text-xs font-extrabold text-muted">{copy.area}</dt>
            <dd className="mt-1 font-extrabold text-ink">{resource.jurisdiction}</dd>
          </div>
          {resource.phone && (
            <div className="border-t border-line pt-2">
              <dt className="text-xs font-extrabold text-muted">{copy.phone}</dt>
              <dd className="mt-1 font-extrabold text-ink">{resource.phone}</dd>
            </div>
          )}
          <div className="border-t border-line pt-2">
            <dt className="text-xs font-extrabold text-muted">{copy.languages}</dt>
            <dd className="mt-1 font-extrabold text-ink">
              {resource.languages.length > 0 ? resource.languages.join(", ") : "n/a"}
            </dd>
          </div>
        </dl>
        {maps && (
          <div className="mt-3 rounded-lg border border-line bg-surface p-3">
            <h4 className="text-xs font-extrabold uppercase text-muted">
              {copy.googleMapsDetail}
            </h4>
            <dl className="mt-2 grid gap-2 text-sm">
              {maps.national_phone_number && (
                <div>
                  <dt className="font-bold text-muted">{copy.googlePhone}</dt>
                  <dd className="font-semibold text-ink">{maps.national_phone_number}</dd>
                </div>
              )}
              {typeof maps.rating === "number" && (
                <div>
                  <dt className="font-bold text-muted">{copy.googleRating}</dt>
                  <dd className="font-semibold text-ink">{maps.rating.toFixed(1)}</dd>
                </div>
              )}
              {maps.website_uri && (
                <div>
                  <dt className="font-bold text-muted">{copy.googleWebsite}</dt>
                  <dd>
                    <a
                      className="font-semibold text-blue"
                      href={maps.website_uri}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {maps.website_uri}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
        <p className="mt-3 rounded-lg border border-orange bg-orange-soft px-3 py-2 font-bold text-ink">
          {resource.availability_notice ?? copy.boundary[3]}
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {resource.url && (
            <a
              className="inline-flex min-h-[42px] w-max items-center gap-3 rounded-lg border border-blue px-3.5 text-sm font-extrabold text-blue"
              href={resource.url}
              target="_blank"
              rel="noreferrer"
            >
              {copy.openResource}
              <AtlasIcon name="external" className="h-4 w-4" />
            </a>
          )}
          {!isStatewideLocator && (
            <a
              className="inline-flex min-h-[42px] w-max items-center gap-3 rounded-lg border border-blue px-3.5 text-sm font-extrabold text-blue"
              href={googleMapsSearchUrl(resource)}
              target="_blank"
              rel="noreferrer"
            >
              {copy.openMaps}
              <AtlasIcon name="external" className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
