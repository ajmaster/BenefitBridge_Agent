import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const flow = [
  { label: "Agent chat", color: "#0756d9" },
  { label: "Privacy screen", color: "#008260" },
  { label: "Official sources", color: "#00684f" },
  { label: "Local handoffs", color: "#ffa800" },
  { label: "Prep documents", color: "#e55343" },
];

const documents = [
  "One-page summary",
  "Documents to bring",
  "Questions to ask",
  "Call script",
  "Local handoffs",
  "Official source sheet",
];

export const DOCUMENT_KIT_DURATION_SECONDS = 30;
export const DOCUMENT_KIT_FPS = 30;
export const DOCUMENT_KIT_WIDTH = 1920;
export const DOCUMENT_KIT_HEIGHT = 1080;

export const DocumentKitDemo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const second = frame / fps;

  return (
    <AbsoluteFill style={styles.stage}>
      <BackgroundGrid />
      <Header />
      <AgentConversation second={second} />
      <WorkflowRail second={second} />
      <Sequence from={7 * fps}>
        <DocumentKit second={second - 7} />
      </Sequence>
      <Footer />
    </AbsoluteFill>
  );
};

const Header = () => {
  return (
    <div style={styles.header}>
      <div style={styles.logo}>BB</div>
      <div>
        <div style={styles.kicker}>AidAtlasCA agent demo</div>
        <h1 style={styles.title}>The agent builds the prep documents</h1>
        <p style={styles.subtitle}>Chat in broad facts. Leave with a source-backed document kit.</p>
      </div>
    </div>
  );
};

const AgentConversation = ({ second }: { second: number }) => {
  const enter = progress(second, 0, 1.4);
  const pulse = interpolate(Math.sin(second * 2.4), [-1, 1], [0, 1]);
  return (
    <div
      style={{
        ...styles.agentPanel,
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)`,
      }}
    >
      <div style={styles.panelTopline}>
        <span style={styles.statusDot} />
        <span>AidAtlasCA Agent</span>
        <span style={styles.panelBadge}>Live workspace</span>
      </div>
      <Bubble speaker="User" text="I am in San Jose and need food, health coverage, and utility help." />
      <Bubble
        speaker="Agent"
        text="I can prepare documents for a benefits conversation. I will use city/county only and official sources."
        active={pulse > 0.45}
      />
      <div style={styles.agentActions}>
        <span>Known facts</span>
        <span>Missing facts</span>
        <span>Build prep documents</span>
      </div>
    </div>
  );
};

const Bubble = ({
  speaker,
  text,
  active = false,
}: {
  speaker: string;
  text: string;
  active?: boolean;
}) => (
  <div
    style={{
      ...styles.bubble,
      borderColor: active ? "#008260" : "#d8deea",
      boxShadow: active ? "0 20px 50px rgba(0, 130, 96, 0.18)" : "none",
    }}
  >
    <strong>{speaker}</strong>
    <p>{text}</p>
  </div>
);

const WorkflowRail = ({ second }: { second: number }) => {
  return (
    <div style={styles.workflowRail}>
      {flow.map((step, index) => {
        const active = second >= 2 + index * 3;
        const stepProgress = progress(second, 2 + index * 3, 1.1);
        return (
          <div key={step.label} style={styles.workflowItem}>
            <div
              style={{
                ...styles.workflowNode,
                background: active ? step.color : "#fff",
                color: active ? "#fff" : "#233252",
                transform: `scale(${interpolate(stepProgress, [0, 1], [0.9, 1])})`,
              }}
            >
              {index + 1}
            </div>
            <div>
              <div style={styles.workflowLabel}>{step.label}</div>
              <div
                style={{
                  ...styles.workflowLine,
                  width: `${interpolate(stepProgress, [0, 1], [18, 108])}px`,
                  background: step.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DocumentKit = ({ second }: { second: number }) => {
  const enter = progress(second, 0, 1.2);
  return (
    <div
      style={{
        ...styles.documentPanel,
        opacity: enter,
        transform: `translateX(${interpolate(enter, [0, 1], [44, 0])}px)`,
      }}
    >
      <div style={styles.documentHeader}>
        <div>
          <div style={styles.documentKicker}>Prep Documents</div>
          <h2 style={styles.documentTitle}>Document kit ready</h2>
        </div>
        <div style={styles.documentSeal}>Source-backed</div>
      </div>
      <div style={styles.documentGrid}>
        {documents.map((document, index) => {
          const reveal = progress(second, 1 + index * 0.55, 0.9);
          return (
            <div
              key={document}
              style={{
                ...styles.documentCard,
                opacity: reveal,
                transform: `translateY(${interpolate(reveal, [0, 1], [24, 0])}px)`,
              }}
            >
              <div style={styles.documentIcon}>{index + 1}</div>
              <strong>{document}</strong>
              <span>{documentSubcopy(index)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const documentSubcopy = (index: number) =>
  [
    "Broad household summary",
    "What to gather safely",
    "Caseworker prompts",
    "Plain-language opener",
    "Call before going",
    "Official links",
  ][index];

const Footer = () => (
  <div style={styles.footer}>
    <span>Official agencies decide eligibility</span>
    <span>No applications submitted</span>
    <span>No exact addresses</span>
    <span>Call before going</span>
  </div>
);

const BackgroundGrid = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drift = interpolate(frame, [0, 30 * fps], [0, -90], clamp);
  return (
    <div
      style={{
        ...styles.backgroundGrid,
        transform: `translateX(${drift}px)`,
      }}
    />
  );
};

function progress(second: number, start: number, duration: number) {
  return interpolate(second, [start, start + duration], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    ...clamp,
  });
}

const styles: Record<string, CSSProperties> = {
  stage: {
    background: "linear-gradient(135deg, #f8fbff 0%, #eaf5ff 46%, #e8f7f0 100%)",
    color: "#07183f",
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    overflow: "hidden",
  },
  backgroundGrid: {
    backgroundImage:
      "linear-gradient(rgba(7, 24, 63, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(7, 24, 63, 0.06) 1px, transparent 1px)",
    backgroundSize: "54px 54px",
    height: "140%",
    left: -120,
    opacity: 0.8,
    position: "absolute",
    top: -120,
    width: "140%",
  },
  header: {
    alignItems: "center",
    display: "flex",
    gap: 22,
    left: 78,
    position: "absolute",
    right: 78,
    top: 58,
    zIndex: 2,
  },
  logo: {
    alignItems: "center",
    background: "#0756d9",
    borderRadius: 18,
    color: "#fff",
    display: "flex",
    fontSize: 28,
    fontWeight: 900,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  kicker: {
    color: "#00684f",
    fontSize: 22,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 62,
    letterSpacing: 0,
    lineHeight: 1,
    margin: "4px 0 10px",
  },
  subtitle: {
    color: "#64708a",
    fontSize: 28,
    margin: 0,
  },
  agentPanel: {
    background: "#fff",
    border: "1px solid #d8deea",
    borderRadius: 24,
    boxShadow: "0 36px 90px rgba(7, 24, 63, 0.18)",
    display: "grid",
    gap: 20,
    left: 78,
    padding: 26,
    position: "absolute",
    top: 242,
    width: 720,
    zIndex: 2,
  },
  panelTopline: {
    alignItems: "center",
    display: "flex",
    gap: 12,
    fontSize: 22,
    fontWeight: 900,
  },
  statusDot: {
    background: "#008260",
    borderRadius: 999,
    height: 14,
    width: 14,
  },
  panelBadge: {
    background: "#eaf5ff",
    border: "1px solid #d8deea",
    borderRadius: 999,
    color: "#233252",
    fontSize: 18,
    marginLeft: "auto",
    padding: "8px 12px",
  },
  bubble: {
    background: "#fbfcfe",
    border: "2px solid #d8deea",
    borderRadius: 18,
    padding: 20,
  },
  agentActions: {
    display: "flex",
    gap: 10,
  },
  workflowRail: {
    display: "grid",
    gap: 18,
    left: 858,
    position: "absolute",
    top: 280,
    width: 310,
    zIndex: 2,
  },
  workflowItem: {
    alignItems: "center",
    display: "flex",
    gap: 14,
  },
  workflowNode: {
    alignItems: "center",
    border: "1px solid #d8deea",
    borderRadius: 14,
    display: "flex",
    fontSize: 24,
    fontWeight: 900,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  workflowLabel: {
    fontSize: 22,
    fontWeight: 900,
  },
  workflowLine: {
    borderRadius: 999,
    height: 6,
    marginTop: 8,
  },
  documentPanel: {
    background: "#07183f",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 28,
    boxShadow: "0 40px 100px rgba(7, 24, 63, 0.26)",
    color: "#fff",
    padding: 30,
    position: "absolute",
    right: 78,
    top: 242,
    width: 640,
    zIndex: 3,
  },
  documentHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
  },
  documentKicker: {
    color: "#8ee8cf",
    fontSize: 20,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  documentTitle: {
    fontSize: 42,
    lineHeight: 1,
    margin: "8px 0 0",
  },
  documentSeal: {
    background: "#fff",
    borderRadius: 999,
    color: "#00684f",
    fontSize: 18,
    fontWeight: 900,
    padding: "12px 16px",
  },
  documentGrid: {
    display: "grid",
    gap: 14,
    gridTemplateColumns: "1fr 1fr",
    marginTop: 28,
  },
  documentCard: {
    background: "#fff",
    borderRadius: 16,
    color: "#07183f",
    display: "grid",
    gap: 10,
    minHeight: 134,
    padding: 18,
  },
  documentIcon: {
    alignItems: "center",
    background: "#e8f7f0",
    borderRadius: 12,
    color: "#00684f",
    display: "flex",
    fontSize: 20,
    fontWeight: 900,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  footer: {
    alignItems: "center",
    background: "#fff",
    border: "1px solid #d8deea",
    borderRadius: 999,
    bottom: 42,
    boxShadow: "0 14px 34px rgba(7, 24, 63, 0.08)",
    color: "#233252",
    display: "flex",
    gap: 22,
    left: 78,
    padding: "16px 22px",
    position: "absolute",
    right: 78,
    zIndex: 4,
  },
};
