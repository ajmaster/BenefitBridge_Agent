"use client";

import AtlasIcon from "@/components/workspace/icons/AtlasIcon";
import { copyFor } from "@/components/conversation-atlas/i18n";
import { useBenefitBridgeContext } from "@/components/workspace/BenefitBridgeContext";
import { BoundaryList } from "@/components/workspace/shared/BoundaryList";
import { PacketPreview } from "@/components/workspace/shared/PacketPreview";

// Section body ported from `PacketPanel` in
// `frontend/components/BenefitBridgeDashboard.tsx` (source lines 888-945). Task 8 already
// extracted the paper-preview half as the shared `PacketPreview` component (source lines
// 903-928, the `!packet` empty state and the `.paperPreview` article) - deliberately
// WITHOUT `data-testid="packet-panel"`, per that component's own comment: in the source,
// that testid lived on the *outer* `.packetGrid` div (source line 912) wrapping BOTH the
// paper preview AND the `.packetActions` aside (export/translate buttons + BoundaryList,
// source lines 930-942). This component builds that missing half - the actions aside - and
// places `data-testid="packet-panel"` on the outer grid composed here, matching the
// source's placement exactly.

export function PacketSection() {
  const { packet, result, busy, snapshot, runExport, runTranslate } = useBenefitBridgeContext();
  const copy = copyFor(snapshot.language);

  return (
    <div className="grid gap-6">
      <div>
        <span className="text-sm font-semibold text-ink-soft">{copy.sections.packet}</span>
        <h1 className="text-2xl font-semibold text-ink">{copy.sectionCopy.packet.title}</h1>
        <p className="mt-1 text-muted">{copy.sectionCopy.packet.body}</p>
      </div>

      <div
        className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]"
        data-testid="packet-panel"
      >
        <PacketPreview packet={packet} result={result} copy={copy} />

        <aside className="grid gap-4 rounded-lg border border-line bg-surface p-4 shadow-atlas-soft">
          <h3 className="text-lg font-semibold text-ink">{copy.packetActions}</h3>
          <p className="text-muted">{copy.packetActionsBody}</p>
          <button
            type="button"
            onClick={runExport}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <span>{copy.exportPacket}</span>
            <AtlasIcon name="arrow" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={runTranslate}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-lg border border-blue px-4 py-2 text-sm font-semibold text-blue disabled:opacity-50"
          >
            <AtlasIcon name="globe" className="h-4 w-4" />
            <span>{copy.translatePacket}</span>
          </button>
          <BoundaryList copy={copy.boundary} compact />
        </aside>
      </div>
    </div>
  );
}
