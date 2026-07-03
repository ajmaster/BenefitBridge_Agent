import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import {
  HERO_LOOP_COLORS,
  HERO_LOOP_HEIGHT,
  HERO_LOOP_WIDTH,
} from "./heroLoop.config";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const fontFamily = "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);

type FlowItem = {
  title: string;
  body: string;
  detail: string;
  color: string;
  icon: "calendar" | "map" | "mic" | "shield";
};

const FLOW_ITEMS: FlowItem[] = [
  {
    title: "Voice or chat",
    body: "Talk or type in English or Spanish.",
    detail: "Voice-ready",
    color: HERO_LOOP_COLORS.blue,
    icon: "mic",
  },
  {
    title: "Privacy + sources",
    body: "Sensitive details are screened before routing.",
    detail: "Source-backed",
    color: HERO_LOOP_COLORS.teal,
    icon: "shield",
  },
  {
    title: "Maps + Places",
    body: "Curated handoffs can show safe map links.",
    detail: "Call before going",
    color: HERO_LOOP_COLORS.coral,
    icon: "map",
  },
  {
    title: "Reminders + docs",
    body: "Calendar nudges and prep documents follow.",
    detail: ".ics + PDF",
    color: HERO_LOOP_COLORS.gold,
    icon: "calendar",
  },
];

const flowTop = 250;
const flowGap = 154;
const flowCardLeft = 1060;
const flowCardWidth = 420;
const flowCardHeight = 128;
const railX = 1022;

const baseText: CSSProperties = {
  margin: 0,
  fontFamily,
  color: HERO_LOOP_COLORS.ink,
};

const Icon = ({ kind, color }: { kind: FlowItem["icon"]; color: string }) => {
  const stroke = HERO_LOOP_COLORS.surface;

  if (kind === "mic") {
    return (
      <svg width={40} height={40} viewBox="0 0 40 40" aria-hidden="true">
        <circle cx={20} cy={20} r={16} fill={color} />
        <path
          d="M16 12.5A4 4 0 0 1 24 12.5V20A4 4 0 0 1 16 20V12.5Z"
          fill="none"
          stroke={stroke}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <path
          d="M11.5 20A8.5 8.5 0 0 0 28.5 20M20 28.5V33"
          fill="none"
          stroke={stroke}
          strokeWidth={3}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (kind === "shield") {
    return (
      <svg width={40} height={40} viewBox="0 0 40 40" aria-hidden="true">
        <path
          d="M20 5L31 9V18C31 25.5 26.5 31.5 20 35C13.5 31.5 9 25.5 9 18V9L20 5Z"
          fill={color}
        />
        <path
          d="M14.5 20L18.2 23.8L26.5 15.5"
          fill="none"
          stroke={stroke}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (kind === "map") {
    return (
      <svg width={40} height={40} viewBox="0 0 40 40" aria-hidden="true">
        <circle cx={20} cy={20} r={16} fill={color} />
        <path
          d="M11 14L17 11.5L24 14L30 11.5V27L24 29.5L17 27L11 29.5V14Z"
          fill="none"
          stroke={stroke}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M17 12V27M24 14V29" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg width={40} height={40} viewBox="0 0 40 40" aria-hidden="true">
      <rect x={9} y={10} width={22} height={22} rx={5} fill={color} />
      <path
        d="M14 7V13M26 7V13M14 18H26M14 24H21"
        fill="none"
        stroke={HERO_LOOP_COLORS.surface}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </svg>
  );
};

const stagePulse = (frame: number, fps: number, stage: number) => {
  const local = frame % (fps * 10);
  const start = stage * 2 * fps;

  return interpolate(local, [start, start + 0.42 * fps, start + 1.56 * fps], [0, 1, 0.18], {
    ...clamp,
    easing: easeOut,
  });
};

const Background = () => {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${HERO_LOOP_COLORS.background} 0%, #eef7ff 45%, #f7fff8 100%)`,
        overflow: "hidden",
      }}
    >
      <svg
        width={HERO_LOOP_WIDTH}
        height={HERO_LOOP_HEIGHT}
        viewBox={`0 0 ${HERO_LOOP_WIDTH} ${HERO_LOOP_HEIGHT}`}
        style={{ position: "absolute", inset: 0 }}
        aria-hidden="true"
      >
        <defs>
          <pattern id="bb-grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M80 0H0V80" fill="none" stroke={HERO_LOOP_COLORS.border} strokeWidth="1" opacity="0.52" />
          </pattern>
        </defs>
        <rect width={HERO_LOOP_WIDTH} height={HERO_LOOP_HEIGHT} fill="url(#bb-grid)" />
        <path
          d="M90 830C260 750 350 770 500 842C650 914 795 920 958 840C1120 760 1260 766 1516 858"
          fill="none"
          stroke={HERO_LOOP_COLORS.teal}
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.12"
        />
      </svg>
    </AbsoluteFill>
  );
};

const Badge = ({ children, color }: { children: string; color: string }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      borderRadius: 999,
      padding: "8px 12px",
      background: color,
      color: HERO_LOOP_COLORS.surface,
      fontFamily,
      fontSize: 19,
      lineHeight: 1,
      fontWeight: 800,
      letterSpacing: 0,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </div>
);

const BoundaryPill = ({ children }: { children: string }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 14px",
      borderRadius: 999,
      border: `2px solid ${HERO_LOOP_COLORS.border}`,
      background: HERO_LOOP_COLORS.surface,
      fontFamily,
      fontSize: 20,
      fontWeight: 800,
      color: HERO_LOOP_COLORS.ink,
      boxShadow: "0 10px 22px rgba(7, 24, 63, 0.06)",
      whiteSpace: "nowrap",
    }}
  >
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 999,
        background: HERO_LOOP_COLORS.green,
        flexShrink: 0,
      }}
    />
    {children}
  </div>
);

const UserBubble = ({ frame, fps }: { frame: number; fps: number }) => {
  const pulse = stagePulse(frame, fps, 0);
  const glow = interpolate(pulse, [0, 1], [0.08, 0.2], clamp);

  return (
    <div
      style={{
        width: 590,
        borderRadius: 26,
        padding: "20px 26px",
        background: "#eaf3ff",
        border: `2px solid ${HERO_LOOP_COLORS.border}`,
        boxShadow: `0 18px 34px rgba(7, 86, 217, ${glow})`,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Badge color={HERO_LOOP_COLORS.blue}>Voice</Badge>
        <p style={{ ...baseText, fontSize: 20, fontWeight: 800, color: HERO_LOOP_COLORS.slate }}>
          Broad location, no sensitive IDs
        </p>
      </div>
      <p style={{ ...baseText, fontSize: 28, lineHeight: 1.18, fontWeight: 850 }}>
        Can I talk this through in Spanish and find food help around San Jose?
      </p>
      <p style={{ ...baseText, fontSize: 21, lineHeight: 1.26, fontWeight: 650, color: HERO_LOOP_COLORS.slate }}>
        I can share my city or ZIP and what I need.
      </p>
    </div>
  );
};

const AgentBubble = ({ frame, fps }: { frame: number; fps: number }) => {
  const local = frame % (fps * 10);
  const barProgress = interpolate(local, [0, 2 * fps, 4 * fps, 6 * fps, 8 * fps], [0.17, 0.4, 0.61, 0.82, 1], {
    ...clamp,
    easing: easeInOut,
  });
  const barWidth = interpolate(barProgress, [0, 1], [118, 534], clamp);

  return (
    <div
      style={{
        marginLeft: 72,
        width: 688,
        borderRadius: 30,
        padding: "22px 28px 24px",
        background: HERO_LOOP_COLORS.ink,
        color: HERO_LOOP_COLORS.surface,
        boxShadow: "0 24px 50px rgba(7, 24, 63, 0.24)",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: HERO_LOOP_COLORS.green,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: HERO_LOOP_COLORS.surface,
              fontFamily,
              fontSize: 25,
              fontWeight: 950,
            }}
          >
            AA
          </div>
          <div>
            <p style={{ ...baseText, color: HERO_LOOP_COLORS.surface, fontSize: 25, fontWeight: 900 }}>
              AidAtlasCA Agent
            </p>
            <p style={{ ...baseText, color: "#bed2ee", fontSize: 18, fontWeight: 750 }}>
              Voice, maps, reminders, and prep assistant
            </p>
          </div>
        </div>
        <Badge color={HERO_LOOP_COLORS.teal}>Voice + maps</Badge>
      </div>

      <p style={{ ...baseText, color: HERO_LOOP_COLORS.surface, fontSize: 29, lineHeight: 1.17, fontWeight: 850 }}>
        I can map curated handoffs, add reminders, and build prep documents from official sources.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <BoundaryPill>Maps use general geography</BoundaryPill>
        <BoundaryPill>Call before going</BoundaryPill>
      </div>

      <div
        style={{
          height: 12,
          borderRadius: 999,
          background: "rgba(255,255,255,0.16)",
          overflow: "hidden",
          marginTop: 2,
        }}
      >
        <div
          style={{
            width: barWidth,
            height: "100%",
            borderRadius: 999,
            background: `linear-gradient(90deg, ${HERO_LOOP_COLORS.teal}, ${HERO_LOOP_COLORS.gold})`,
          }}
        />
      </div>
    </div>
  );
};

const ConversationPanel = ({ frame, fps }: { frame: number; fps: number }) => {
  const pulse = stagePulse(frame, fps, 0);
  const haloOpacity = interpolate(pulse, [0, 1], [0.12, 0.28], clamp);

  return (
    <div
      style={{
        position: "absolute",
        left: 86,
        top: 92,
        width: 904,
        height: 754,
        borderRadius: 36,
        background: "rgba(255, 255, 255, 0.94)",
        border: `3px solid ${HERO_LOOP_COLORS.surface}`,
        boxShadow: `0 34px 90px rgba(7, 24, 63, 0.18), 0 0 0 12px rgba(0, 130, 96, ${haloOpacity})`,
        padding: 34,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
        <div>
          <p style={{ ...baseText, fontSize: 60, lineHeight: 0.98, fontWeight: 950, letterSpacing: 0 }}>
            AidAtlasCA Agent
          </p>
          <p style={{ ...baseText, marginTop: 10, fontSize: 23, lineHeight: 1.22, fontWeight: 750, color: HERO_LOOP_COLORS.slate }}>
            Talk or type. See mapped handoffs. Schedule reminders. Leave prepared.
          </p>
        </div>
        <div
          style={{
            flexShrink: 0,
            width: 106,
            height: 106,
            borderRadius: 32,
            background: HERO_LOOP_COLORS.ink,
            boxShadow: "0 18px 34px rgba(7, 24, 63, 0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width={72} height={72} viewBox="0 0 72 72" aria-hidden="true">
            <rect x={12} y={14} width={48} height={36} rx={16} fill={HERO_LOOP_COLORS.teal} />
            <circle cx={28} cy={32} r={4.5} fill={HERO_LOOP_COLORS.surface} />
            <circle cx={44} cy={32} r={4.5} fill={HERO_LOOP_COLORS.surface} />
            <path d="M27 42C32 46 40 46 45 42" fill="none" stroke={HERO_LOOP_COLORS.surface} strokeWidth={4} strokeLinecap="round" />
            <path d="M36 8V14" stroke={HERO_LOOP_COLORS.gold} strokeWidth={5} strokeLinecap="round" />
            <path d="M22 56H50" stroke={HERO_LOOP_COLORS.gold} strokeWidth={5} strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <UserBubble frame={frame} fps={fps} />
      <AgentBubble frame={frame} fps={fps} />

    </div>
  );
};

const ConnectorLayer = ({ frame, fps }: { frame: number; fps: number }) => {
  const local = frame % (fps * 10);
  const tokenX = interpolate(local, [0, 1.2 * fps, 2 * fps, 4 * fps, 6 * fps, 8 * fps], [960, railX, railX, railX, railX, railX], {
    ...clamp,
    easing: easeInOut,
  });
  const tokenY = interpolate(local, [0, 1.2 * fps, 2 * fps, 4 * fps, 6 * fps, 8 * fps], [452, flowTop + 56, flowTop + 56, flowTop + flowGap + 56, flowTop + 2 * flowGap + 56, flowTop + 3 * flowGap + 56], {
    ...clamp,
    easing: easeInOut,
  });
  const firstSegment = interpolate(local, [0, 1.2 * fps], [0.18, 1], clamp);
  const railFill = interpolate(local, [2 * fps, 8 * fps], [0, 1], clamp);

  return (
    <svg
      width={HERO_LOOP_WIDTH}
      height={HERO_LOOP_HEIGHT}
      viewBox={`0 0 ${HERO_LOOP_WIDTH} ${HERO_LOOP_HEIGHT}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      aria-hidden="true"
    >
      <path
        d={`M960 452 C990 452 1004 ${flowTop + 56} ${railX} ${flowTop + 56}`}
        fill="none"
        stroke={HERO_LOOP_COLORS.line}
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.58"
      />
      <path
        d={`M960 452 C990 452 1004 ${flowTop + 56} ${railX} ${flowTop + 56}`}
        fill="none"
        stroke={HERO_LOOP_COLORS.teal}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray="112"
        strokeDashoffset={112 - 112 * firstSegment}
      />
      <line
        x1={railX}
        y1={flowTop + 56}
        x2={railX}
        y2={flowTop + 3 * flowGap + 56}
        stroke={HERO_LOOP_COLORS.line}
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.58"
      />
      <line
        x1={railX}
        y1={flowTop + 56}
        x2={railX}
        y2={flowTop + 56 + 3 * flowGap * railFill}
        stroke={HERO_LOOP_COLORS.teal}
        strokeWidth="8"
        strokeLinecap="round"
      />
      {[0, 1, 2, 3].map((index) => {
        const y = flowTop + index * flowGap + 56;
        return (
          <g key={index}>
            <circle cx={railX} cy={y} r={20} fill={HERO_LOOP_COLORS.surface} stroke={HERO_LOOP_COLORS.line} strokeWidth={4} />
            <circle cx={railX} cy={y} r={8} fill={FLOW_ITEMS[index].color} />
          </g>
        );
      })}
      <circle cx={tokenX} cy={tokenY} r={18} fill={HERO_LOOP_COLORS.surface} stroke={HERO_LOOP_COLORS.ink} strokeWidth={4} />
      <circle cx={tokenX} cy={tokenY} r={7} fill={HERO_LOOP_COLORS.gold} />
    </svg>
  );
};

const FlowCard = ({
  item,
  index,
  frame,
  fps,
}: {
  item: FlowItem;
  index: number;
  frame: number;
  fps: number;
}) => {
  const pulse = stagePulse(frame, fps, index + 1);
  const scale = interpolate(pulse, [0, 1], [1, 1.022], clamp);
  const accentOpacity = interpolate(pulse, [0, 1], [0.12, 0.3], clamp);
  const top = flowTop + index * flowGap;

  return (
    <div
      style={{
        position: "absolute",
        left: flowCardLeft,
        top,
        width: flowCardWidth,
        height: flowCardHeight,
        borderRadius: 24,
        background: HERO_LOOP_COLORS.surface,
        border: `3px solid ${index === 0 ? HERO_LOOP_COLORS.teal : HERO_LOOP_COLORS.border}`,
        boxShadow: `0 24px 48px rgba(7, 24, 63, 0.12), 0 0 0 10px rgba(${item.color === HERO_LOOP_COLORS.gold ? "255, 191, 63" : item.color === HERO_LOOP_COLORS.coral ? "255, 111, 97" : item.color === HERO_LOOP_COLORS.blue ? "7, 86, 217" : "0, 130, 96"}, ${accentOpacity})`,
        padding: "18px 20px",
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: "54px 1fr",
        gap: 16,
        alignItems: "center",
        transform: `scale(${scale})`,
      }}
    >
      <Icon kind={item.icon} color={item.color} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <p style={{ ...baseText, fontSize: 25, lineHeight: 1.03, fontWeight: 900 }}>
            {item.title}
          </p>
          <p
            style={{
              ...baseText,
              borderRadius: 999,
              padding: "7px 10px",
              background: "#f4f7fb",
              color: HERO_LOOP_COLORS.slate,
              fontSize: 15,
              fontWeight: 850,
              whiteSpace: "nowrap",
            }}
          >
            {item.detail}
          </p>
        </div>
        <p style={{ ...baseText, marginTop: 8, color: HERO_LOOP_COLORS.slate, fontSize: 17, lineHeight: 1.18, fontWeight: 650 }}>
          {item.body}
        </p>
      </div>
    </div>
  );
};

const FlowRail = ({ frame, fps }: { frame: number; fps: number }) => (
  <>
    <div
      style={{
        position: "absolute",
        left: 1048,
        top: 118,
        width: 446,
      }}
    >
      <p style={{ ...baseText, fontSize: 34, lineHeight: 1.05, fontWeight: 950 }}>
        Agent-powered local navigation
      </p>
      <p style={{ ...baseText, marginTop: 8, color: HERO_LOOP_COLORS.slate, fontSize: 21, lineHeight: 1.26, fontWeight: 700 }}>
        Voice, maps, reminders, and documents stay inside the AidAtlasCA boundary.
      </p>
    </div>
    <ConnectorLayer frame={frame} fps={fps} />
    {FLOW_ITEMS.map((item, index) => (
      <FlowCard key={item.title} item={item} index={index} frame={frame} fps={fps} />
    ))}
  </>
);

const FooterBoundary = () => (
  <div
    style={{
      position: "absolute",
      left: 86,
      right: 86,
      bottom: 54,
      height: 72,
      borderRadius: 24,
      background: "rgba(255,255,255,0.92)",
      border: `2px solid ${HERO_LOOP_COLORS.border}`,
      boxShadow: "0 18px 42px rgba(7, 24, 63, 0.1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 18,
      fontFamily,
      fontSize: 25,
      lineHeight: 1,
      fontWeight: 900,
      color: HERO_LOOP_COLORS.ink,
      whiteSpace: "nowrap",
    }}
  >
    <span>Official agencies decide eligibility</span>
    <span style={{ color: HERO_LOOP_COLORS.line }}>|</span>
    <span>No benefit amounts or application submission</span>
    <span style={{ color: HERO_LOOP_COLORS.line }}>|</span>
    <span>Maps are handoffs, not live availability</span>
  </div>
);

export const HeroLoop = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: HERO_LOOP_COLORS.background, overflow: "hidden" }}>
      <Background />
      <ConversationPanel frame={frame} fps={fps} />
      <FlowRail frame={frame} fps={fps} />
      <FooterBoundary />
    </AbsoluteFill>
  );
};
