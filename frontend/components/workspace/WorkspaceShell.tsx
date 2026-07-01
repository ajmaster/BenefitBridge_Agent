import type { ReactNode } from "react";
import { WorkspaceSidebarNav } from "./WorkspaceSidebarNav";
import { ConversationPanel } from "./ConversationPanel";

// Single-instance layout: each of `WorkspaceSidebarNav` and `ConversationPanel` renders
// exactly once in the DOM. Responsive repositioning is achieved purely with Tailwind's
// grid `order-*` utilities across a `grid-cols-1 lg:grid-cols-[240px_1fr_380px]` grid, so
// on mobile all three regions naturally stack in document order (nav, main, chat) via
// `order-1/2/3`, and on desktop the same elements are placed into the three grid tracks
// via `lg:order-none` (source grid order) - no conditional/duplicate rendering.
export function WorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[240px_1fr_380px]">
      <aside className="order-1 border-b border-line bg-surface lg:order-none lg:border-b-0 lg:border-r">
        <WorkspaceSidebarNav />
      </aside>

      <main className="order-2 min-w-0 overflow-y-auto p-6 lg:order-none">{children}</main>

      <aside className="order-3 border-t border-line bg-surface lg:order-none lg:border-t-0 lg:border-l">
        <ConversationPanel />
      </aside>
    </div>
  );
}
