"use client";

import { useRouter } from "next/navigation";
import AtlasIcon from "@/components/workspace/icons/AtlasIcon";
import { copyFor, needLabels } from "@/components/conversation-atlas/i18n";
import { useBenefitBridgeContext } from "@/components/workspace/BenefitBridgeContext";
import { ReadinessPanel } from "@/components/workspace/shared/ReadinessPanel";
import { syntheticProfiles } from "@/data/syntheticProfiles";
import type { HouseholdSnapshotInput } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const needsOptions = [
  "food",
  "health coverage",
  "utility help",
  "cash aid",
  "housing",
  "WIC",
  "shelter",
];

const workflowIcons = ["chat", "shield", "source", "map", "document"] as const;

export function PrepareSection() {
  const router = useRouter();
  const {
    selectedProfileId,
    snapshot,
    userText,
    busy,
    readiness,
    handleSelectProfile,
    updateSnapshot,
    setUserText,
    toggleNeed,
    runPrepare,
  } = useBenefitBridgeContext();
  const locale = snapshot.language;
  const copy = copyFor(locale);

  const knownFacts = [
    [copy.factLocation, snapshot.location_text || copy.missingLocation],
    [copy.factNeeds, formatNeeds(snapshot.needs, locale) || copy.missingNeeds],
    [copy.factHousehold, formatHousehold(snapshot) || copy.missingHousehold],
    [copy.factIncome, snapshot.income_range_monthly || copy.missingIncome],
    [copy.factHousing, housingLabel(snapshot.housing_status, copy)],
  ];
  const missingFacts = [
    !snapshot.location_text ? copy.missingLocation : null,
    snapshot.needs.length === 0 ? copy.missingNeeds : null,
    !snapshot.household_size ? copy.missingHousehold : null,
    !snapshot.income_range_monthly ? copy.missingIncome : null,
    !snapshot.housing_status || snapshot.housing_status === "unknown"
      ? copy.missingHousing
      : null,
  ].filter(Boolean);

  async function handlePrepare() {
    await runPrepare();
    router.push("/app/packet/");
  }

  return (
    <div className="grid min-w-0 gap-6">
      <section className="overflow-hidden rounded-lg border border-line bg-ink text-white shadow-atlas-soft">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div className="min-w-0">
            <span className="text-sm font-semibold uppercase tracking-wide text-sky">
              {copy.prepareHeroKicker}
            </span>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
              {copy.prepareHeroTitle}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
              {copy.prepareHeroBody}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {copy.boundary.slice(0, 3).map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <DocumentFlow copy={copy} />
        </div>
      </section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="grid min-w-0 gap-4">
          <div className="grid gap-4 rounded-lg border border-line bg-surface p-4 shadow-atlas-soft">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className="text-sm font-semibold text-ink-soft">
                  {copy.sections.prepare}
                </span>
                <h2 className="text-2xl font-semibold text-ink">
                  {copy.sectionCopy.prepare.title}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
                  {copy.sectionCopy.prepare.body}
                </p>
              </div>
              <button
                type="button"
                onClick={handlePrepare}
                disabled={busy}
                data-testid="prepare-button"
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white shadow-atlas-soft disabled:opacity-50"
              >
                <span>{busy ? copy.preparing : copy.buildPrepDocuments}</span>
                <AtlasIcon name="arrow" className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {knownFacts.map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-0 rounded-lg border border-line bg-sky p-3"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    {label}
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-ink">{value}</div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-orange bg-orange-soft p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <AtlasIcon name="prepare" className="h-4 w-4 text-orange" />
                {copy.missingFacts}
              </div>
              {missingFacts.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {missingFacts.map((item) => (
                    <span
                      key={String(item)}
                      className="rounded-full border border-orange bg-white px-3 py-1 text-xs font-semibold text-ink-soft"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-ink-soft">{copy.noMissingFacts}</p>
              )}
            </div>
          </div>

          <details className="rounded-lg border border-line bg-surface shadow-atlas-soft" open>
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink">
              {copy.editSnapshot}
            </summary>
            <div className="grid gap-4 border-t border-line p-4">
              <div className="grid gap-1.5">
                <Label>{copy.syntheticProfile}</Label>
                <Select value={selectedProfileId} onValueChange={handleSelectProfile}>
                  <SelectTrigger aria-label={copy.syntheticProfile}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {syntheticProfiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.label} - {profile.summary}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>{copy.languageLabel}</Label>
                  <Select
                    value={snapshot.language}
                    onValueChange={(value) =>
                      updateSnapshot("language", value as HouseholdSnapshotInput["language"])
                    }
                  >
                    <SelectTrigger aria-label={copy.languageLabel}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Espanol</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>{copy.locationLabel}</Label>
                  <Input
                    value={snapshot.location_text}
                    onChange={(event) => updateSnapshot("location_text", event.target.value)}
                    placeholder={copy.locationPlaceholder}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>{copy.householdSize}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={snapshot.household_size ?? ""}
                    onChange={(event) =>
                      updateSnapshot(
                        "household_size",
                        event.target.value ? Number(event.target.value) : undefined,
                      )
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>{copy.adults}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={snapshot.adults ?? ""}
                    onChange={(event) =>
                      updateSnapshot(
                        "adults",
                        event.target.value ? Number(event.target.value) : undefined,
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>{copy.incomeRange}</Label>
                  <Input
                    value={snapshot.income_range_monthly ?? ""}
                    onChange={(event) => updateSnapshot("income_range_monthly", event.target.value)}
                    placeholder={copy.incomePlaceholder}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>{copy.housingStatus}</Label>
                  <Select
                    value={snapshot.housing_status}
                    onValueChange={(value) => updateSnapshot("housing_status", value)}
                  >
                    <SelectTrigger aria-label={copy.housingStatus}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="housed">{copy.housingOptions.housed}</SelectItem>
                      <SelectItem value="housed but rent stressed">
                        {copy.housingOptions["housed but rent stressed"]}
                      </SelectItem>
                      <SelectItem value="unstable">{copy.housingOptions.unstable}</SelectItem>
                      <SelectItem value="unknown">{copy.housingOptions.unknown}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <fieldset className="grid gap-2">
                <legend className="mb-1 text-sm font-medium text-ink">{copy.helpAreas}</legend>
                <div className="flex flex-wrap gap-2">
                  {needsOptions.map((need) => {
                    const checked = snapshot.needs.includes(need);
                    return (
                      <label
                        key={need}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                          checked
                            ? "border-green bg-green-soft text-green-dark"
                            : "border-line text-ink-soft"
                        }`}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggleNeed(need)} />
                        <span>{needLabels[locale][need] ?? need}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid gap-1.5">
                <Label>{copy.packetContext}</Label>
                <Textarea
                  value={userText}
                  rows={4}
                  onChange={(event) => setUserText(event.target.value)}
                  placeholder={copy.packetContextPlaceholder}
                />
              </div>
            </div>
          </details>
        </section>

        <aside className="grid min-w-0 gap-4 content-start">
          <div className="rounded-lg border border-line bg-surface p-4 shadow-atlas-soft">
            <h3 className="text-base font-semibold text-ink">{copy.documentWorkflow}</h3>
            <div className="mt-4 grid gap-3">
              {[
                copy.documentFlowAsk,
                copy.documentFlowPrivacy,
                copy.documentFlowSources,
                copy.documentFlowHandoffs,
                copy.documentFlowKit,
              ].map((step, index) => (
                <div key={step} className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-soft text-green-dark">
                    <AtlasIcon name={workflowIcons[index]} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 text-sm font-semibold text-ink">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <details className="rounded-lg border border-line bg-surface shadow-atlas-soft">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink">
              {copy.systemStatus}
            </summary>
            <div className="border-t border-line p-4">
              <ReadinessPanel readiness={readiness} copy={copy} />
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}

function formatNeeds(needs: string[], locale: HouseholdSnapshotInput["language"]) {
  return needs.map((need) => needLabels[locale][need] ?? need).join(", ");
}

function formatHousehold(snapshot: HouseholdSnapshotInput) {
  if (!snapshot.household_size) return "";
  if (snapshot.adults === undefined) return String(snapshot.household_size);
  return `${snapshot.household_size} total, ${snapshot.adults} adults`;
}

function housingLabel(housingStatus: string, copy: ReturnType<typeof copyFor>) {
  const options = copy.housingOptions as Record<string, string>;
  return options[housingStatus] ?? housingStatus;
}

function DocumentFlow({ copy }: { copy: ReturnType<typeof copyFor> }) {
  const steps = [
    copy.documentFlowAsk,
    copy.documentFlowPrivacy,
    copy.documentFlowSources,
    copy.documentFlowHandoffs,
    copy.documentFlowKit,
  ];

  return (
    <div className="rounded-lg border border-white/20 bg-white/10 p-4">
      <div className="grid gap-3">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-ink">
              <AtlasIcon name={workflowIcons[index]} className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/60">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="truncate text-sm font-semibold">{step}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
