import type { ReactNode } from "react";
import { WorkspaceSidebarNav } from "./WorkspaceSidebarNav";
import { ConversationPanel } from "./ConversationPanel";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[240px_1fr_380px]">
      {/* Mobile: sidebar nav stacked above main content. Replaced by a Sheet-based
          interaction in a later, more polished pass; for now this only needs to avoid
          horizontal overflow on narrow viewports. */}
      <div className="border-b border-line bg-surface lg:hidden">
        <WorkspaceSidebarNav />
      </div>

      <aside className="hidden border-r border-line bg-surface lg:block">
        <WorkspaceSidebarNav />
      </aside>

      <main className="min-w-0 overflow-y-auto p-6">{children}</main>

      {/* Mobile: conversation panel stacked below main content. */}
      <div className="border-t border-line bg-surface lg:hidden">
        <ConversationPanel />
      </div>

      <aside className="hidden border-l border-line bg-surface lg:block">
        <ConversationPanel />
      </aside>
    </div>
  );
}
