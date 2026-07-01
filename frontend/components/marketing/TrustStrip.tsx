import type { Locale } from "@/components/conversation-atlas/i18n";
import { copyFor } from "@/components/conversation-atlas/i18n";
import AtlasIcon from "@/components/workspace/icons/AtlasIcon";

export function TrustStrip({ locale }: { locale: Locale }) {
  const boundary = copyFor(locale).boundary;

  return (
    <section className="border-y border-line bg-surface px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {boundary.map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm text-muted">
            <AtlasIcon name="shield" className="h-4 w-4 shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
