import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { HERO_LOOP_COLORS } from "./heroLoop.config";

const CENTER_X = 800;
const CENTER_Y = 500;

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

// ---------------------------------------------------------------------------
// Beat 1: Message — a chat bubble with redacted placeholder lines slides in.
// ---------------------------------------------------------------------------

const REDACTED_LINE_WIDTHS = [380, 320, 240];

const ChatBubble = ({ enterFrom = -140, holdOpacity }: { enterFrom?: number; holdOpacity?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = interpolate(frame, [0, fps], [0, 1], clamp);
  const translateX = interpolate(frame, [0, fps], [enterFrom, 0], clamp);
  const opacity = holdOpacity ?? enter;

  return (
    <div
      style={{
        position: "absolute",
        left: 200,
        top: 380,
        width: 560,
        height: 220,
        borderRadius: 24,
        background: HERO_LOOP_COLORS.blue,
        opacity,
        transform: `translateX(${translateX}px)`,
        boxShadow: "0 24px 48px rgba(7, 24, 63, 0.18)",
        padding: 32,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 18,
      }}
    >
      {REDACTED_LINE_WIDTHS.map((width, index) => (
        <div
          key={width}
          style={{
            width,
            height: 18,
            borderRadius: 9,
            background: "rgba(255, 255, 255, 0.55)",
            opacity: interpolate(
              frame,
              [index * 6, index * 6 + fps * 0.5],
              [0, 1],
              clamp,
            ),
          }}
        />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Beat 2: Reasoning — nodes scale in around a hub, connected by drawn lines.
// ---------------------------------------------------------------------------

const REASONING_NODES = [
  { x: CENTER_X, y: CENTER_Y - 220, r: 24, delay: 0 },
  { x: CENTER_X + 220, y: CENTER_Y, r: 20, delay: 10 },
  { x: CENTER_X, y: CENTER_Y + 220, r: 22, delay: 20 },
  { x: CENTER_X - 220, y: CENTER_Y, r: 18, delay: 30 },
];

const ReasoningHub = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <svg
      viewBox="0 0 1600 1000"
      style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }}
    >
      {REASONING_NODES.map((node) => {
        const dx = node.x - CENTER_X;
        const dy = node.y - CENTER_Y;
        const lineLength = Math.sqrt(dx * dx + dy * dy);
        const dashOffset = interpolate(
          frame,
          [node.delay, node.delay + 30],
          [lineLength, 0],
          clamp,
        );
        return (
          <line
            key={`line-${node.x}-${node.y}`}
            x1={CENTER_X}
            y1={CENTER_Y}
            x2={node.x}
            y2={node.y}
            stroke={HERO_LOOP_COLORS.ink}
            strokeWidth={3}
            strokeOpacity={0.35}
            strokeDasharray={lineLength}
            strokeDashoffset={dashOffset}
          />
        );
      })}
      <circle cx={CENTER_X} cy={CENTER_Y} r={16} fill={HERO_LOOP_COLORS.ink} />
      {REASONING_NODES.map((node) => {
        const scale = spring({
          frame: frame - node.delay,
          fps,
          config: { damping: 12, mass: 0.6 },
        });
        return (
          <circle
            key={`node-${node.x}-${node.y}`}
            cx={node.x}
            cy={node.y}
            r={node.r * scale}
            fill={HERO_LOOP_COLORS.blue}
          />
        );
      })}
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Beat 3: Sources fan out — small green cards with a checkmark glyph.
// ---------------------------------------------------------------------------

const SOURCE_CARD_TARGETS = [
  { x: 480, y: 640, rotate: -6 },
  { x: 800, y: 700, rotate: 3 },
  { x: 1120, y: 640, rotate: 8 },
];

const SourceCard = ({
  x,
  y,
  rotate,
  delay,
}: {
  x: number;
  y: number;
  rotate: number;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = Math.max(0, frame - delay);
  const progress = spring({ frame: localFrame, fps, config: { damping: 14, mass: 0.7 } });
  const currentX = interpolate(progress, [0, 1], [CENTER_X, x]);
  const currentY = interpolate(progress, [0, 1], [CENTER_Y, y]);
  const currentRotate = interpolate(progress, [0, 1], [0, rotate]);
  const opacity = interpolate(frame, [delay, delay + fps * 0.4], [0, 1], clamp);

  return (
    <div
      style={{
        position: "absolute",
        left: currentX - 90,
        top: currentY - 56,
        width: 180,
        height: 112,
        borderRadius: 16,
        background: HERO_LOOP_COLORS.green,
        opacity,
        transform: `rotate(${currentRotate}deg)`,
        boxShadow: "0 16px 30px rgba(7, 24, 63, 0.16)",
        padding: 16,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <svg width={22} height={22} viewBox="0 0 22 22">
        <circle cx={11} cy={11} r={11} fill="rgba(255,255,255,0.9)" />
        <polyline
          points="6,11 9.5,14.5 16,7"
          fill="none"
          stroke={HERO_LOOP_COLORS.green}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div
        style={{
          width: "70%",
          height: 12,
          borderRadius: 6,
          background: "rgba(255, 255, 255, 0.6)",
        }}
      />
    </div>
  );
};

const SourcesFanOut = () => (
  <>
    {SOURCE_CARD_TARGETS.map((target, index) => (
      <SourceCard key={target.x} x={target.x} y={target.y} rotate={target.rotate} delay={index * 15} />
    ))}
  </>
);

// ---------------------------------------------------------------------------
// Beat 4: Packet assembles — source cards converge into one packet card.
// ---------------------------------------------------------------------------

const CHECKLIST_WIDTHS = [300, 260, 340];

const PacketAssembly = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const convergeProgress = interpolate(frame, [0, fps * 1.2], [0, 1], clamp);
  const packetOpacity = interpolate(frame, [fps * 0.6, fps * 1.2], [0, 1], clamp);
  const packetScale = interpolate(frame, [fps * 0.6, fps * 1.2], [0.85, 1], clamp);

  return (
    <>
      {SOURCE_CARD_TARGETS.map((target, index) => {
        const x = interpolate(convergeProgress, [0, 1], [target.x, CENTER_X]);
        const y = interpolate(convergeProgress, [0, 1], [target.y, CENTER_Y]);
        const scale = interpolate(convergeProgress, [0, 1], [1, 0.3]);
        const opacity = interpolate(frame, [0, fps * 1.1], [1, 0], clamp);
        return (
          <div
            key={`converge-${target.x}`}
            style={{
              position: "absolute",
              left: x - 90,
              top: y - 56,
              width: 180,
              height: 112,
              borderRadius: 16,
              background: HERO_LOOP_COLORS.green,
              opacity,
              transform: `scale(${scale})`,
              zIndex: 2 + index,
            }}
          />
        );
      })}

      <div
        style={{
          position: "absolute",
          left: CENTER_X - 260,
          top: CENTER_Y - 200,
          width: 520,
          height: 400,
          borderRadius: 28,
          border: `4px solid ${HERO_LOOP_COLORS.blue}`,
          background: HERO_LOOP_COLORS.surface,
          opacity: packetOpacity,
          transform: `scale(${packetScale})`,
          boxShadow: "0 30px 60px rgba(7, 24, 63, 0.2)",
          padding: 40,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 24,
          zIndex: 10,
        }}
      >
        {CHECKLIST_WIDTHS.map((width, index) => {
          // Packet card finishes forming at fps * 1.2 (frame 36 @ 30fps). Start
          // the checklist fades just after that and stagger + bound them so all
          // 3 lines complete well before the beat ends at local frame 69.
          const lineStart = fps * 1.2 + 1 + index * 9;
          const lineOpacity = interpolate(frame, [lineStart, lineStart + 10], [0, 1], clamp);
          return (
            <div key={width} style={{ display: "flex", alignItems: "center", gap: 14, opacity: lineOpacity }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  border: `2px solid ${HERO_LOOP_COLORS.green}`,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  width,
                  height: 14,
                  borderRadius: 7,
                  background: HERO_LOOP_COLORS.ink,
                  opacity: 0.18,
                }}
              />
            </div>
          );
        })}
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Beat 5: Loop tie-back — packet fades out, the chat bubble fades back in.
// ---------------------------------------------------------------------------

const LoopTieBack = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const packetOpacity = interpolate(frame, [0, fps * 0.6], [1, 0], clamp);
  // Only hint at the bubble reappearing (low peak opacity) so the last frame
  // stays close to frame 0's fully-transparent starting state for a clean loop.
  const bubbleOpacity = interpolate(frame, [fps * 0.3, fps * 0.6], [0, 0.12], clamp);

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: CENTER_X - 260,
          top: CENTER_Y - 200,
          width: 520,
          height: 400,
          borderRadius: 28,
          border: `4px solid ${HERO_LOOP_COLORS.blue}`,
          background: HERO_LOOP_COLORS.surface,
          opacity: packetOpacity,
        }}
      />
      <ChatBubble holdOpacity={bubbleOpacity} enterFrom={0} />
    </>
  );
};

// ---------------------------------------------------------------------------
// Captions
// ---------------------------------------------------------------------------

const captionStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  width: 1600,
  textAlign: "center",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  fontSize: 22,
  fontWeight: 700,
  color: HERO_LOOP_COLORS.ink,
};

const Caption = ({ text, top }: { text: string; top: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], clamp);
  return (
    <div style={{ ...captionStyle, top, opacity }}>
      {text}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Root composition
// ---------------------------------------------------------------------------

const BEATS = {
  message: { from: 0, duration: 60 },
  reasoning: { from: 60, duration: 90 },
  sources: { from: 150, duration: 60 },
  packet: { from: 210, duration: 70 },
  loop: { from: 280, duration: 20 },
};

export const HeroLoop = () => {
  return (
    <AbsoluteFill style={{ background: HERO_LOOP_COLORS.background }}>
      <Sequence from={BEATS.message.from} durationInFrames={BEATS.message.duration} premountFor={30}>
        <ChatBubble />
        <Caption text="Ask" top={630} />
      </Sequence>

      <Sequence from={BEATS.reasoning.from} durationInFrames={BEATS.reasoning.duration} premountFor={30}>
        <ReasoningHub />
      </Sequence>

      <Sequence from={BEATS.sources.from} durationInFrames={BEATS.sources.duration} premountFor={30}>
        <SourcesFanOut />
        <Caption text="Sources" top={800} />
      </Sequence>

      <Sequence from={BEATS.packet.from} durationInFrames={BEATS.packet.duration} premountFor={30}>
        <PacketAssembly />
        <Caption text="Packet" top={730} />
      </Sequence>

      <Sequence from={BEATS.loop.from} durationInFrames={BEATS.loop.duration} premountFor={30}>
        <LoopTieBack />
      </Sequence>
    </AbsoluteFill>
  );
};
