import { ChatSection } from "@/components/workspace/sections/ChatSection";

// The workspace default (`/app/`) shows the same content as `/app/chat/` per the plan's
// IA: the actual chat UI is the persistent side panel, not page content, so both routes
// render `ChatSection`.
export default function AppIndexPage() {
  return <ChatSection />;
}
