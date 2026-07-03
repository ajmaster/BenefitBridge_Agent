import type { copyFor } from "@/components/conversation-atlas/i18n";
import { BRAND_NAME } from "@/lib/brand";
import type { PrepareResult, PrepPacket } from "@/lib/types";

// Ported from the paper-preview portion of `PacketPanel` in
// `frontend/components/BenefitBridgeDashboard.tsx` (source lines 888-929: the `!packet`
// empty-state guard at lines 903-909, and the `.paperPreview` article at lines 913-928; plus
// the private `ListBlock` helper at lines 1150-1161, used only by the paper preview).
// `.packetGrid`/`.paperPreview`/`.paperHeader`/`.paperColumns`/`.listBlock`/`.callScript`/
// `.emptyPanel` styling is from
// `frontend/components/conversation-atlas/ConversationAtlas.module.css`. Prop-based in the
// source (`PacketPanel` received `packet`/`result`/`copy` - plus `busy`/`onExport`/
// `onTranslate`, which move to `PacketSection` in Task 9 and are NOT part of this component)
// from the monolith's top-level controller state - kept prop-based here.
//
// NOTE on the `packet-panel` split: in the source, `data-testid="packet-panel"` lived on the
// *outer* two-column `.packetGrid` div (source line 912) that wrapped BOTH this paper-preview
// article AND the `.packetActions` aside (export/translate buttons + BoundaryList, moved to
// `PacketSection` in Task 9 per the task brief). That wrapping div is not built in this task's
// scope - only the paper-preview half is - so `data-testid="packet-panel"` is intentionally
// NOT applied on this component's root. Task 9's `PacketSection` is responsible for placing
// `data-testid="packet-panel"` on the grid it composes from this `PacketPreview` plus its own
// action aside, matching the source's placement exactly.

type AtlasCopy = ReturnType<typeof copyFor>;

export function PacketPreview({
  packet,
  result,
  copy,
}: {
  packet?: PrepPacket;
  result: PrepareResult;
  copy: AtlasCopy;
}) {
  if (!packet) {
    return (
      <div className="rounded-lg border border-line bg-surface p-6 shadow-atlas-soft">
        <p className="text-muted">{copy.noPacket}</p>
      </div>
    );
  }

  return (
    <article className="grid gap-4 rounded-lg border border-line bg-surface p-6 shadow-atlas-soft">
      <div className="flex items-center justify-between gap-2.5 border-b-2 border-blue pb-3">
        <span className="font-extrabold text-ink">{BRAND_NAME}</span>
        <strong className="text-xs font-extrabold text-green-dark">
          {result.route.replaceAll("_", " ")}
        </strong>
      </div>
      <h3 className="text-xl font-semibold text-ink">{copy.packetPreview}</h3>
      <p className="text-muted">{packet.household_snapshot_summary}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <ListBlock title={copy.checklist} items={packet.document_checklist.slice(0, 6)} />
        <ListBlock title={copy.questions} items={packet.caseworker_questions.slice(0, 5)} />
      </div>
      <div className="rounded-lg border border-line bg-sky p-3.5">
        <h4 className="mb-2 text-sm font-semibold text-ink">{copy.callScript}</h4>
        <p className="text-ink-soft">{packet.call_script}</p>
      </div>
    </article>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-ink">{title}</h4>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((item) => (
          <li key={item} className="leading-snug text-ink-soft">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
