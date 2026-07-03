import type { Caption } from "@remotion/captions";
import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { type Beat, type DemoFlow, flowById } from "./flows";

export type DemoVideoProps = {
  flowId: DemoFlow["id"];
};

const toneColors = {
  green: "#1f8a5b",
  blue: "#2563eb",
  amber: "#b87503",
  purple: "#7c3aed",
} as const;

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export const DemoVideo = ({ flowId }: DemoVideoProps) => {
  const flow = flowById[flowId];
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const second = frame / fps;
  const activeBeat = getActiveBeat(flow, second);
  const activeCaption = getActiveCaption(flow.captions, second * 1000);

  return (
    <AbsoluteFill style={styles.stage}>
      <div style={styles.header}>
        <div style={{ ...styles.logo, background: flow.accent }}>BB</div>
        <div>
          <div style={styles.kicker}>AidAtlasCA demo</div>
          <h1 style={styles.title}>{flow.title}</h1>
          <p style={styles.subtitle}>{flow.subtitle}</p>
        </div>
        <div style={styles.audience}>{flow.audience}</div>
      </div>

      <ScreenShowcase flow={flow} beat={activeBeat} />

      {flow.beats.map((beat) => (
        <Sequence
          key={`${flow.id}-${beat.from}`}
          from={beat.from * fps}
          durationInFrames={beat.duration * fps}
          premountFor={fps}
        >
          <BeatCallout beat={beat} accent={flow.accent} />
        </Sequence>
      ))}

      <ProgressRail flow={flow} currentSecond={second} />
      <CaptionBar caption={activeCaption} accent={flow.accent} />
      <FooterBoundary />
    </AbsoluteFill>
  );
};

const ScreenShowcase = ({ flow, beat }: { flow: DemoFlow; beat: Beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - beat.from * fps;
  const enter = interpolate(localFrame, [0, 1.2 * fps], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    ...clamp,
  });
  const drift = interpolate(localFrame, [0, beat.duration * fps], [0, beat.imageY], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    ...clamp,
  });
  const imagePath = `captures/${flow.capturePrefix}-${beat.capture}.png`;
  const cursorX = interpolate(
    localFrame,
    [0.5 * fps, 3 * fps],
    [beat.cursor.fromX, beat.cursor.toX],
    { easing: Easing.bezier(0.16, 1, 0.3, 1), ...clamp },
  );
  const cursorY = interpolate(
    localFrame,
    [0.5 * fps, 3 * fps],
    [beat.cursor.fromY, beat.cursor.toY],
    { easing: Easing.bezier(0.16, 1, 0.3, 1), ...clamp },
  );

  return (
    <div style={styles.screenShell}>
      <div style={styles.browserChrome}>
        <span style={styles.dotRed} />
        <span style={styles.dotAmber} />
        <span style={styles.dotGreen} />
        <div style={styles.urlBar}>AidAtlasCA public demo</div>
      </div>
      <div style={styles.screenViewport}>
        <Img
          src={staticFile(imagePath)}
          style={{
            ...styles.screenImage,
            opacity: enter,
            transform: `translateY(${drift}%) scale(${beat.zoom})`,
          }}
        />
        <HighlightBox beat={beat} />
        <div
          style={{
            ...styles.cursor,
            left: `${cursorX}%`,
            top: `${cursorY}%`,
            opacity: enter,
          }}
        />
      </div>
    </div>
  );
};

const BeatCallout = ({ beat, accent }: { beat: Beat; accent: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 1 * fps, beat.duration * fps - 0.5 * fps], [0, 1, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    ...clamp,
  });
  const x = interpolate(frame, [0, 1 * fps], [32, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    ...clamp,
  });

  return (
    <div
      style={{
        ...styles.callout,
        borderColor: accent,
        opacity,
        transform: `translateX(${x}px)`,
      }}
    >
      <div style={{ ...styles.calloutPill, background: accent }}>{beat.highlight.label}</div>
      <h2 style={styles.calloutTitle}>{beat.headline}</h2>
      <p style={styles.calloutBody}>{beat.body}</p>
    </div>
  );
};

const HighlightBox = ({ beat }: { beat: Beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = interpolate(frame % (2 * fps), [0, fps, 2 * fps], [0.78, 1, 0.78], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    ...clamp,
  });
  const color = toneColors[beat.highlight.tone];

  return (
    <div
      style={{
        ...styles.highlight,
        left: `${beat.highlight.x}%`,
        top: `${beat.highlight.y}%`,
        width: `${beat.highlight.width}%`,
        height: `${beat.highlight.height}%`,
        borderColor: color,
        boxShadow: `0 0 0 999px rgba(6, 15, 34, 0.12), 0 0 36px ${color}`,
        opacity: pulse,
      }}
    >
      <span style={{ ...styles.highlightLabel, background: color }}>
        {beat.highlight.label}
      </span>
    </div>
  );
};

const CaptionBar = ({
  caption,
  accent,
}: {
  caption: Caption | undefined;
  accent: string;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 1 * fps], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    ...clamp,
  });

  return (
    <div style={{ ...styles.captionBar, borderColor: accent, opacity }}>
      <span style={{ ...styles.captionBullet, background: accent }} />
      <p style={styles.captionText}>
        {caption?.text ?? "AidAtlasCA helps users prepare for official benefits conversations."}
      </p>
    </div>
  );
};

const ProgressRail = ({
  flow,
  currentSecond,
}: {
  flow: DemoFlow;
  currentSecond: number;
}) => {
  return (
    <div style={styles.progressRail}>
      {flow.beats.map((beat, index) => {
        const active =
          currentSecond >= beat.from && currentSecond < beat.from + beat.duration;
        return (
          <div
            key={beat.from}
            style={{
              ...styles.progressItem,
              background: active ? flow.accent : "rgba(15, 23, 42, 0.08)",
              color: active ? "#fff" : "#274060",
            }}
          >
            {index + 1}
          </div>
        );
      })}
    </div>
  );
};

const FooterBoundary = () => {
  return (
    <div style={styles.footer}>
      <span>No SSNs</span>
      <span>No application submission</span>
      <span>Official agencies decide eligibility</span>
      <span>Call before going</span>
    </div>
  );
};

const getActiveBeat = (flow: DemoFlow, second: number) => {
  return (
    flow.beats.find(
      (beat) => second >= beat.from && second < beat.from + beat.duration,
    ) ?? flow.beats[flow.beats.length - 1]
  );
};

const getActiveCaption = (captions: Caption[], ms: number) => {
  return captions.find((caption) => ms >= caption.startMs && ms <= caption.endMs);
};

const styles: Record<string, CSSProperties> = {
  stage: {
    background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 42%, #ecfdf5 100%)",
    color: "#102033",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    display: "flex",
    gap: 22,
    left: 68,
    position: "absolute",
    right: 68,
    top: 44,
    zIndex: 10,
  },
  logo: {
    alignItems: "center",
    borderRadius: 18,
    color: "#fff",
    display: "flex",
    fontSize: 26,
    fontWeight: 900,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  kicker: {
    color: "#52647a",
    fontSize: 22,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 48,
    letterSpacing: 0,
    lineHeight: 1,
    margin: "4px 0 8px",
  },
  subtitle: {
    color: "#52647a",
    fontSize: 26,
    margin: 0,
  },
  audience: {
    background: "#fff",
    border: "1px solid #d8e0ea",
    borderRadius: 999,
    boxShadow: "0 14px 34px rgba(20, 34, 56, 0.12)",
    fontSize: 22,
    fontWeight: 800,
    marginLeft: "auto",
    padding: "14px 20px",
  },
  screenShell: {
    background: "#f8fafc",
    border: "1px solid #d8e0ea",
    borderRadius: 28,
    boxShadow: "0 36px 90px rgba(15, 23, 42, 0.22)",
    height: 790,
    left: 68,
    overflow: "hidden",
    position: "absolute",
    top: 178,
    width: 1328,
  },
  browserChrome: {
    alignItems: "center",
    background: "#e9eef5",
    borderBottom: "1px solid #d8e0ea",
    display: "flex",
    gap: 9,
    height: 54,
    padding: "0 18px",
  },
  dotRed: {
    background: "#f87171",
    borderRadius: 999,
    height: 14,
    width: 14,
  },
  dotAmber: {
    background: "#fbbf24",
    borderRadius: 999,
    height: 14,
    width: 14,
  },
  dotGreen: {
    background: "#34d399",
    borderRadius: 999,
    height: 14,
    width: 14,
  },
  urlBar: {
    background: "#fff",
    border: "1px solid #d8e0ea",
    borderRadius: 999,
    color: "#52647a",
    flex: 1,
    fontSize: 18,
    fontWeight: 700,
    marginLeft: 10,
    padding: "8px 16px",
  },
  screenViewport: {
    height: 736,
    overflow: "hidden",
    position: "relative",
  },
  screenImage: {
    height: "100%",
    left: 0,
    objectFit: "cover",
    objectPosition: "top left",
    position: "absolute",
    top: 0,
    transformOrigin: "top left",
    width: "100%",
  },
  highlight: {
    border: "6px solid",
    borderRadius: 18,
    position: "absolute",
  },
  highlightLabel: {
    borderRadius: 999,
    color: "#fff",
    fontSize: 18,
    fontWeight: 900,
    left: 12,
    padding: "8px 12px",
    position: "absolute",
    top: -22,
  },
  cursor: {
    borderBottom: "22px solid transparent",
    borderLeft: "22px solid #0f172a",
    borderTop: "22px solid transparent",
    filter: "drop-shadow(0 8px 10px rgba(15, 23, 42, 0.32))",
    height: 0,
    position: "absolute",
    transform: "rotate(-25deg)",
    width: 0,
  },
  callout: {
    background: "rgba(255, 255, 255, 0.94)",
    border: "3px solid",
    borderRadius: 28,
    boxShadow: "0 28px 70px rgba(15, 23, 42, 0.2)",
    padding: 28,
    position: "absolute",
    right: 68,
    top: 236,
    width: 392,
    zIndex: 20,
  },
  calloutPill: {
    borderRadius: 999,
    color: "#fff",
    display: "inline-block",
    fontSize: 18,
    fontWeight: 900,
    marginBottom: 18,
    padding: "8px 13px",
  },
  calloutTitle: {
    fontSize: 38,
    letterSpacing: 0,
    lineHeight: 1.06,
    margin: "0 0 14px",
  },
  calloutBody: {
    color: "#52647a",
    fontSize: 23,
    lineHeight: 1.35,
    margin: 0,
  },
  captionBar: {
    alignItems: "center",
    background: "rgba(15, 23, 42, 0.94)",
    border: "3px solid",
    borderRadius: 28,
    bottom: 58,
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.3)",
    display: "flex",
    gap: 18,
    left: 250,
    padding: "20px 28px",
    position: "absolute",
    right: 250,
    zIndex: 30,
  },
  captionBullet: {
    borderRadius: 999,
    flex: "0 0 auto",
    height: 18,
    width: 18,
  },
  captionText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: 750,
    lineHeight: 1.28,
    margin: 0,
  },
  progressRail: {
    bottom: 166,
    display: "flex",
    gap: 12,
    justifyContent: "center",
    left: 68,
    position: "absolute",
    right: 68,
    zIndex: 25,
  },
  progressItem: {
    alignItems: "center",
    border: "1px solid rgba(15, 23, 42, 0.1)",
    borderRadius: 999,
    display: "flex",
    fontSize: 20,
    fontWeight: 900,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  footer: {
    bottom: 18,
    color: "#52647a",
    display: "flex",
    fontSize: 18,
    fontWeight: 800,
    gap: 28,
    justifyContent: "center",
    left: 68,
    position: "absolute",
    right: 68,
  },
};
