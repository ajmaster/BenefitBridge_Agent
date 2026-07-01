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

// Household snapshot form ported from `PreparePanel` in
// `frontend/components/BenefitBridgeDashboard.tsx` (source lines 532-696): 8 fields
// (synthetic profile select, language, location, household size, adults, income range,
// housing status, needs checkboxes) plus the free-text packet context textarea and the
// `data-testid="prepare-button"` submit button (source lines 681-690). Vanilla
// `<select>`/`<input>`/`<textarea>`/checkbox markup is swapped for the vendored shadcn
// equivalents per the Task 9 brief; field values/handlers are unchanged (`onSnapshotChange`
// -> `updateSnapshot`, `onToggleNeed` -> `toggleNeed`, `onTextChange` -> `setUserText`).
//
// Navigation: the source's local `prepareAndShowPacket` wrapper (source lines 111-114) ran
// `await runPrepare()` then `moveToSection("packet")` - a DOM scroll, since the monolith was
// a single page. The controller's `runPrepare` itself never navigates. Here that wrapper is
// reproduced as `handlePrepare`, replacing the scroll with `router.push("/app/packet/")` so
// the controller stays routing-agnostic per the plan's constraints.

const needsOptions = [
  "food",
  "health coverage",
  "utility help",
  "cash aid",
  "housing",
  "WIC",
  "shelter",
];

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

  async function handlePrepare() {
    await runPrepare();
    router.push("/app/packet/");
  }

  return (
    <div className="grid gap-6">
      <div>
        <span className="text-sm font-semibold text-ink-soft">{copy.sections.prepare}</span>
        <h1 className="text-2xl font-semibold text-ink">{copy.sectionCopy.prepare.title}</h1>
        <p className="mt-1 text-muted">{copy.sectionCopy.prepare.body}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="grid gap-4 rounded-lg border border-line bg-surface p-4 shadow-atlas-soft">
          <div className="grid gap-1.5">
            <Label>{copy.syntheticProfile}</Label>
            <Select value={selectedProfileId} onValueChange={handleSelectProfile}>
              <SelectTrigger>
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
                <SelectTrigger>
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
                  updateSnapshot("adults", event.target.value ? Number(event.target.value) : undefined)
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
                <SelectTrigger>
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
            <div className="flex flex-wrap gap-3">
              {needsOptions.map((need) => (
                <label
                  key={need}
                  className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-ink-soft"
                >
                  <Checkbox
                    checked={snapshot.needs.includes(need)}
                    onCheckedChange={() => toggleNeed(need)}
                  />
                  <span>{needLabels[locale][need] ?? need}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-1.5">
            <Label>{copy.packetContext}</Label>
            <Textarea
              value={userText}
              rows={5}
              onChange={(event) => setUserText(event.target.value)}
              placeholder={copy.packetContextPlaceholder}
            />
          </div>

          <button
            type="button"
            onClick={handlePrepare}
            disabled={busy}
            data-testid="prepare-button"
            className="flex items-center justify-center gap-2 rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <span>{busy ? copy.preparing : copy.preparePacket}</span>
            <AtlasIcon name="arrow" className="h-4 w-4" />
          </button>
        </div>

        <ReadinessPanel readiness={readiness} copy={copy} />
      </div>
    </div>
  );
}
