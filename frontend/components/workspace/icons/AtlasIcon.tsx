import {
  ArrowRight,
  Bot,
  Building2,
  CalendarCheck2,
  Check,
  CirclePlay,
  ExternalLink,
  FileText,
  Languages,
  Map,
  MapPinned,
  Mic2,
  Route,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type AtlasIconName =
  | "arrow"
  | "bay"
  | "calendar"
  | "chat"
  | "check"
  | "document"
  | "external"
  | "globe"
  | "language"
  | "map"
  | "mic"
  | "pin"
  | "places"
  | "play"
  | "prepare"
  | "shield"
  | "source"
  | "user";

const iconMap = {
  arrow: ArrowRight,
  bay: Route,
  calendar: CalendarCheck2,
  chat: Bot,
  check: Check,
  document: FileText,
  external: ExternalLink,
  globe: Languages,
  language: Languages,
  map: Map,
  mic: Mic2,
  pin: MapPinned,
  places: Building2,
  play: CirclePlay,
  prepare: CalendarCheck2,
  shield: ShieldCheck,
  source: FileText,
  user: UserRound,
} satisfies Record<AtlasIconName, LucideIcon>;

export default function AtlasIcon({
  name,
  className,
}: {
  name: AtlasIconName;
  className?: string;
}) {
  const Icon = iconMap[name];
  return <Icon aria-hidden="true" className={className} strokeWidth={2.25} />;
}
