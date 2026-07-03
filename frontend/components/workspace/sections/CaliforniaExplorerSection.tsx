"use client";

import { useEffect, useMemo, useState } from "react";
import { copyFor, needLabels } from "@/components/conversation-atlas/i18n";
import {
  fetchCaliforniaCounties,
  fetchCaliforniaResources,
} from "@/lib/api";
import type {
  ApprovedSourceMetadata,
  CaliforniaCountyCounts,
  CaliforniaCountySummary,
  CaliforniaResourceCoverageFilter,
  LocalResource,
} from "@/lib/types";
import { useBenefitBridgeContext } from "@/components/workspace/BenefitBridgeContext";
import { CaliforniaCountyPins } from "@/components/workspace/shared/CaliforniaCountyPins";
import { MapEmbedPanel } from "@/components/workspace/shared/MapEmbedPanel";
import { ResourceCard } from "@/components/workspace/shared/ResourceCard";
import californiaCountiesJson from "@/data/californiaCounties.json";
import approvedSourcesJson from "@/data/approvedSources.json";

const staticCounties = californiaCountiesJson as CaliforniaCountySummary[];
const approvedSources = approvedSourcesJson as ApprovedSourceMetadata[];
const CALL_BEFORE_GOING = "Call before going to confirm current availability.";

export function CaliforniaExplorerSection() {
  const { snapshot, displayResources } = useBenefitBridgeContext();
  const locale = snapshot.language;
  const copy = copyFor(locale);
  const [counties, setCounties] = useState<CaliforniaCountySummary[]>(staticCounties);
  const [counts, setCounts] = useState<CaliforniaCountyCounts>(() =>
    summarizeCounties(staticCounties),
  );
  const [query, setQuery] = useState("");
  const [needType, setNeedType] = useState(() => snapshot.needs[0] ?? "food");
  const [coverageFilter, setCoverageFilter] =
    useState<CaliforniaResourceCoverageFilter>("all");
  const [selectedCountyId, setSelectedCountyId] = useState(
    () => findInitialCountyId(snapshot.location_text) ?? "santa_clara",
  );
  const [resources, setResources] = useState<LocalResource[]>([]);
  const [apiFallback, setApiFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCaliforniaCounties()
      .then((response) => {
        if (cancelled) return;
        setCounties(response.counties);
        setCounts(response.counts);
      })
      .catch(() => {
        if (!cancelled) setApiFallback(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCounties = useMemo(
    () => filterCounties(counties, query, coverageFilter),
    [counties, query, coverageFilter],
  );
  const selectedCounty =
    counties.find((county) => county.id === selectedCountyId) ??
    filteredCounties[0] ??
    counties[0];

  useEffect(() => {
    if (!selectedCounty) return;
    let cancelled = false;
    fetchCaliforniaResources({
      county: selectedCounty.name,
      needType,
      coverage: coverageFilter,
      limit: 12,
    })
      .then((response) => {
        if (cancelled) return;
        setResources(response.resources);
      })
      .catch(() => {
        if (cancelled) return;
        setApiFallback(true);
        setResources(
          fallbackResourcesForCounty(
            selectedCounty,
            needType,
            coverageFilter,
            displayResources,
          ),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [coverageFilter, displayResources, needType, selectedCounty]);

  const mapCounties = filteredCounties.length > 0 ? filteredCounties : counties;
  const needOptions = needFilterOptions(locale);

  return (
    <div className="grid gap-6">
      <div>
        <span className="text-sm font-semibold text-ink-soft">{copy.sections.california}</span>
        <h1 className="text-2xl font-semibold text-ink">
          {copy.sectionCopy.california.title}
        </h1>
        <p className="mt-1 text-muted">{copy.sectionCopy.california.body}</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={copy.californiaCounties} value={counts.total_counties} />
        <MetricCard label={copy.californiaReviewedCounties} value={counts.reviewed_local} />
        <MetricCard label={copy.californiaStatewideCounties} value={counts.statewide_core} />
        <MetricCard label={copy.californiaApprovedSources} value={counts.approved_sources} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div
          className="relative min-h-[420px] overflow-hidden rounded-lg border border-line bg-sky bg-[url('/visuals/california-service-map.svg')] bg-center bg-no-repeat p-4 [background-size:82%_auto]"
          aria-label="Simplified California county coverage map"
          data-testid="california-map-panel"
        >
          <CaliforniaCountyPins
            counties={mapCounties}
            selectedCountyName={selectedCounty?.name}
            large
          />
        </div>

        <article className="grid gap-3 rounded-lg border border-line bg-surface p-4 shadow-atlas-soft">
          <div>
            <span className="text-sm font-semibold text-ink-soft">
              {selectedCounty?.coverage_label}
            </span>
            <h2 className="mt-1 text-xl font-semibold text-ink">
              {selectedCounty?.name ?? "California"}
            </h2>
            <p className="mt-1 text-sm text-muted">{copy.californiaBody}</p>
          </div>
          <dl className="grid gap-2">
            <SummaryRow label="FIPS" value={selectedCounty?.fips ?? "n/a"} />
            <SummaryRow
              label={copy.californiaCountySources}
              value={String(selectedCounty?.source_count ?? 0)}
            />
            <SummaryRow
              label={copy.loadedResources}
              value={String(selectedCounty?.local_resource_count ?? 0)}
            />
            <SummaryRow
              label={copy.californiaMajorCities}
              value={(selectedCounty?.major_cities ?? []).slice(0, 5).join(", ") || "n/a"}
            />
            <SummaryRow
              label={copy.californiaPrimaryOffice}
              value={selectedCounty?.primary_benefits_office?.organization ?? "Statewide locator"}
            />
          </dl>
        </article>
      </section>

      <section className="grid gap-3 rounded-lg border border-line bg-surface p-4 shadow-atlas-soft">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(160px,0.7fr)_minmax(190px,0.7fr)]">
          <label className="grid gap-1 text-sm font-semibold text-ink" htmlFor="county-search">
            {copy.californiaSearch}
            <input
              id="county-search"
              data-testid="california-search"
              value={query}
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                const matches = filterCounties(counties, value, coverageFilter);
                if (matches[0]) setSelectedCountyId(matches[0].id);
              }}
              placeholder={copy.californiaSearchPlaceholder}
              className="min-h-11 rounded-lg border border-line bg-white px-3 text-sm text-ink"
            />
          </label>

          <label className="grid gap-1 text-sm font-semibold text-ink" htmlFor="need-filter">
            {copy.californiaNeedFilter}
            <select
              id="need-filter"
              data-testid="california-need-filter"
              value={needType}
              onChange={(event) => setNeedType(event.target.value)}
              className="min-h-11 rounded-lg border border-line bg-white px-3 text-sm text-ink"
            >
              {needOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-semibold text-ink" htmlFor="coverage-filter">
            {copy.californiaCoverageFilter}
            <select
              id="coverage-filter"
              data-testid="california-coverage-filter"
              value={coverageFilter}
              onChange={(event) => {
                const value = event.target.value as CaliforniaResourceCoverageFilter;
                setCoverageFilter(value);
                const matches = filterCounties(counties, query, value);
                if (matches[0]) setSelectedCountyId(matches[0].id);
              }}
              className="min-h-11 rounded-lg border border-line bg-white px-3 text-sm text-ink"
            >
              <option value="all">{copy.californiaCoverageAll}</option>
              <option value="reviewed_local">{copy.californiaReviewedLocal}</option>
              <option value="statewide_locator">{copy.californiaStatewideLocator}</option>
            </select>
          </label>
        </div>
        {apiFallback && (
          <p className="rounded-lg border border-orange bg-orange-soft px-3 py-2 text-sm font-bold text-ink">
            {copy.californiaStaticFallback}
          </p>
        )}
      </section>

      <section className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {filteredCounties.map((county) => (
            <button
              key={county.id}
              type="button"
              data-testid="california-county-card"
              onClick={() => setSelectedCountyId(county.id)}
              className={
                county.id === selectedCounty?.id
                  ? "grid min-h-[148px] gap-2 rounded-lg border border-blue bg-sky p-4 text-left shadow-atlas"
                  : "grid min-h-[148px] gap-2 rounded-lg border border-line bg-surface p-4 text-left shadow-atlas-soft transition hover:border-line-strong hover:shadow-atlas"
              }
            >
              <span className="text-xs font-extrabold uppercase text-muted">
                {county.coverage_level === "reviewed_local"
                  ? copy.californiaReviewedLocal
                  : copy.californiaStatewideLocator}
              </span>
              <strong className="text-base text-ink">{county.name}</strong>
              <span className="text-sm text-muted">
                {county.major_cities.slice(0, 3).join(", ") || county.fips}
              </span>
              <span className="text-sm font-bold text-ink-soft">
                {county.source_count} {copy.sourcesMetric.toLowerCase()} /{" "}
                {county.local_resource_count} {copy.localResource.toLowerCase()}
              </span>
            </button>
          ))}
        </div>
        {filteredCounties.length === 0 && (
          <p className="rounded-lg border border-line bg-surface p-4 text-sm text-muted">
            {copy.californiaNoCounties}
          </p>
        )}
      </section>

      <section className="grid gap-3" data-testid="california-resource-grid">
        <div>
          <h2 className="text-lg font-semibold text-ink">
            {selectedCounty?.name ?? "California"} {copy.localHandoffs}
          </h2>
          <p className="mt-1 text-sm font-bold text-ink-soft">{CALL_BEFORE_GOING}</p>
        </div>
        {resources.length > 0 ? (
          <>
            <MapEmbedPanel resources={resources} copy={copy} locale={locale} />
            <div className="grid gap-3.5 sm:grid-cols-2">
              {resources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} copy={copy} />
              ))}
            </div>
          </>
        ) : (
          <p className="rounded-lg border border-line bg-surface p-4 text-sm text-muted">
            {copy.californiaNoResources}
          </p>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-atlas-soft">
      <dt className="text-sm font-semibold text-ink-soft">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold text-ink">{value}</dd>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-line pt-2">
      <dt className="text-xs font-extrabold text-muted">{label}</dt>
      <dd className="mt-1 font-extrabold text-ink">{value}</dd>
    </div>
  );
}

function summarizeCounties(counties: CaliforniaCountySummary[]): CaliforniaCountyCounts {
  return {
    total_counties: counties.length,
    reviewed_local: counties.filter((county) => county.coverage_level === "reviewed_local")
      .length,
    statewide_core: counties.filter((county) => county.coverage_level === "statewide_core")
      .length,
    approved_sources: approvedSources.length,
    local_resources: counties.reduce(
      (total, county) => total + county.local_resource_count,
      0,
    ),
  };
}

function filterCounties(
  counties: CaliforniaCountySummary[],
  query: string,
  coverageFilter: CaliforniaResourceCoverageFilter,
) {
  const terms = normalizeSearch(query).split(" ").filter(Boolean);
  return counties.filter((county) => {
    if (coverageFilter === "reviewed_local" && county.coverage_level !== "reviewed_local") {
      return false;
    }
    if (coverageFilter === "statewide_locator" && county.coverage_level !== "statewide_core") {
      return false;
    }
    if (terms.length === 0) return true;
    const haystack = normalizeSearch(
      [
        county.name,
        county.fips,
        county.coverage_label,
        ...county.aliases,
        ...county.major_cities,
      ].join(" "),
    );
    return terms.every((term) => haystack.includes(term));
  });
}

function normalizeSearch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findInitialCountyId(locationText: string) {
  const location = normalizeSearch(locationText);
  if (!location) return null;
  return (
    staticCounties.find((county) => {
      const names = [county.name, county.fips, ...county.aliases, ...county.major_cities];
      return names.some((name) => location.includes(normalizeSearch(name)));
    })?.id ?? null
  );
}

function needFilterOptions(locale: "en" | "es") {
  return [
    { value: "food", label: needLabels[locale]["food"] ?? "Food" },
    { value: "shelter", label: needLabels[locale]["shelter"] ?? "Shelter" },
    { value: "housing", label: needLabels[locale]["housing"] ?? "Housing" },
    { value: "health", label: needLabels[locale]["health coverage"] ?? "Health" },
    { value: "wic", label: needLabels[locale]["WIC"] ?? "WIC" },
    { value: "utility", label: needLabels[locale]["utility help"] ?? "Utility help" },
    { value: "cash_assistance", label: needLabels[locale]["cash aid"] ?? "Cash aid" },
    { value: "benefits_office", label: locale === "es" ? "Oficina de beneficios" : "Benefits office" },
  ];
}

function fallbackResourcesForCounty(
  county: CaliforniaCountySummary,
  needType: string,
  coverageFilter: CaliforniaResourceCoverageFilter,
  displayResources: LocalResource[],
): LocalResource[] {
  const reviewed = displayResources.filter(
    (resource) =>
      resourceMatchesCounty(resource, county) &&
      resourceMatchesNeed(resource, needType) &&
      resource.coverage_level !== "statewide_locator",
  );
  if (coverageFilter === "reviewed_local") return reviewed;
  if (reviewed.length > 0 && coverageFilter === "all") return reviewed;
  return buildLocatorResources(county, needType).filter((resource) =>
    coverageFilter === "all" ? true : resource.coverage_level === coverageFilter,
  );
}

function resourceMatchesCounty(resource: LocalResource, county: CaliforniaCountySummary) {
  const haystack = normalizeSearch(
    `${resource.jurisdiction} ${resource.organization} ${resource.map_query ?? ""}`,
  );
  return [county.name, ...county.aliases, ...county.major_cities].some((name) =>
    haystack.includes(normalizeSearch(name)),
  );
}

function resourceMatchesNeed(resource: LocalResource, needType: string) {
  const need = normalizeSearch(needType);
  if (!need) return true;
  const haystack = normalizeSearch(`${resource.service_type} ${resource.service_name}`);
  return haystack.includes(need) || need.includes(haystack);
}

function buildLocatorResources(
  county: CaliforniaCountySummary,
  needType: string,
): LocalResource[] {
  return locatorSourceIds(needType)
    .map((sourceId) => approvedSources.find((source) => source.id === sourceId))
    .filter((source): source is ApprovedSourceMetadata => Boolean(source))
    .map((source) => ({
      id: `static_locator_${county.id}_${source.id}`,
      organization: source.name,
      service_name: locatorServiceName(source.id, needType),
      service_type: normalizedNeedType(needType),
      jurisdiction: county.name,
      phone: source.id === "ca_211_home" ? "211" : undefined,
      url: source.url,
      languages: [],
      eligibility_notes:
        "Statewide locator handoff; local resource records are not fully curated for this county.",
      call_before_going: true,
      coverage_level: "statewide_locator",
      coverage_label: "Statewide locator handoff",
      availability_notice: CALL_BEFORE_GOING,
      source_citations: [
        {
          source_id: source.id,
          source_title: source.name,
          agency_owner: source.owner_type,
          source_type: source.level,
          url: source.url,
          last_checked: source.last_checked,
        },
      ],
    }));
}

function normalizedNeedType(needType: string) {
  const need = needType.toLowerCase();
  if (need.includes("food")) return "food";
  if (need.includes("shelter")) return "shelter";
  if (need.includes("housing")) return "housing";
  if (need.includes("wic")) return "wic";
  if (need.includes("health") || need.includes("medi")) return "health";
  if (need.includes("utility") || need.includes("energy")) return "utility";
  if (need.includes("cash")) return "cash_assistance";
  return "benefits_office";
}

function locatorSourceIds(needType: string) {
  const normalized = normalizedNeedType(needType);
  const sourceIdsByNeed: Record<string, string[]> = {
    benefits_office: ["cdss_county_offices", "benefitscal_info", "ca_211_home"],
    cash_assistance: ["cdss_county_offices", "benefitscal_info", "ca_211_home"],
    food: ["cdss_food_banks", "cafoodbanks_members", "ca_211_home"],
    health: ["dhcs_county_offices", "dhcs_medi_cal_apply", "covered_ca_get_started"],
    housing: ["ca_211_home", "hud_housing_counselor_api"],
    shelter: ["ca_211_home", "hud_housing_counselor_api"],
    utility: ["csd_liheap_program", "caliheapapply_home", "ca_211_home"],
    wic: ["cdph_wic_office_grocer_locator", "cdph_wic_home", "ca_211_home"],
  };
  return sourceIdsByNeed[normalized] ?? sourceIdsByNeed.benefits_office;
}

function locatorServiceName(sourceId: string, needType: string) {
  if (sourceId === "ca_211_home") return "211 California resource navigation";
  const labels: Record<string, string> = {
    benefits_office: "County benefits office locator",
    cash_assistance: "County cash-aid and benefits office locator",
    food: "Food resource locator",
    health: "Health coverage office locator",
    housing: "Housing resource locator",
    shelter: "Shelter and housing resource navigation",
    utility: "Utility assistance locator",
    wic: "WIC office and grocer locator",
  };
  return labels[normalizedNeedType(needType)] ?? "Statewide resource locator";
}
