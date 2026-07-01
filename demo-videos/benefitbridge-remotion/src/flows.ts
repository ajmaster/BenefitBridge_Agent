import type { Caption } from "@remotion/captions";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION_SECONDS = 45;
export const ATLAS_DURATION_SECONDS = 28;

export type CaptureName = "initial" | "chat" | "resources" | "sources" | "packet" | "spanish";

export type Highlight = {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tone: "green" | "blue" | "amber" | "purple";
};

export type CursorMove = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

export type Beat = {
  from: number;
  duration: number;
  capture: CaptureName;
  headline: string;
  body: string;
  highlight: Highlight;
  cursor: CursorMove;
  imageY: number;
  zoom: number;
};

export type DemoFlow = {
  id:
    | "SanJoseFamilyNavigator"
    | "SfFoodShelterHandoff"
    | "SpanishWicPrep"
    | "ConversationAtlasDemo";
  capturePrefix: "sanjose" | "sf" | "spanish";
  title: string;
  subtitle: string;
  audience: string;
  accent: string;
  durationSeconds: number;
  captions: Caption[];
  beats: Beat[];
};

const caption = (text: string, start: number, end: number): Caption => ({
  text,
  startMs: start * 1000,
  endMs: end * 1000,
  timestampMs: null,
  confidence: null,
});

export const flows: DemoFlow[] = [
  {
    id: "SanJoseFamilyNavigator",
    capturePrefix: "sanjose",
    title: "San Jose Family Navigator",
    subtitle: "Food, health coverage, utilities, WIC, and prep packet handoff",
    audience: "Synthetic San Jose household",
    accent: "#1f8a5b",
    durationSeconds: DURATION_SECONDS,
    captions: [
      caption(
        "A user starts with a simple chat message: city, household size, and the help areas they care about.",
        1,
        7,
      ),
      caption(
        "BenefitBridge turns broad facts into source-backed answer cards, without asking for SSNs or documents.",
        8,
        15,
      ),
      caption(
        "Each benefit path includes missing facts, next steps, and official links for CalFresh, Medi-Cal, LIHEAP, and WIC.",
        16,
        24,
      ),
      caption(
        "The Sources tab makes the handoff auditable: official links, current source labels, and local resource guidance.",
        25,
        33,
      ),
      caption(
        "The end result is a practical prep packet: what to ask, what to gather, and what to call before visiting.",
        34,
        43,
      ),
    ],
    beats: [
      {
        from: 0,
        duration: 8,
        capture: "initial",
        headline: "Start with a normal chat",
        body: "No account, no upload, no sensitive numbers. The user shares only broad household and need areas.",
        highlight: {
          label: "Agent conversation",
          x: 5,
          y: 12,
          width: 28,
          height: 37,
          tone: "blue",
        },
        cursor: { fromX: 13, fromY: 82, toX: 22, toY: 64 },
        imageY: 0,
        zoom: 1.06,
      },
      {
        from: 8,
        duration: 9,
        capture: "chat",
        headline: "The response becomes A2UI",
        body: "Facts, next questions, paths worth checking, local handoffs, source links, and packet summary render as distinct cards.",
        highlight: {
          label: "A2UI answer cards",
          x: 5,
          y: 20,
          width: 28,
          height: 64,
          tone: "green",
        },
        cursor: { fromX: 25, fromY: 74, toX: 13, toY: 31 },
        imageY: -8,
        zoom: 1.1,
      },
      {
        from: 17,
        duration: 9,
        capture: "chat",
        headline: "Benefit paths stay grounded",
        body: "The middle panel shows prep paths, missing facts, and warnings. It does not decide eligibility or estimate benefit amounts.",
        highlight: {
          label: "Paths worth checking",
          x: 34,
          y: 11,
          width: 34,
          height: 53,
          tone: "amber",
        },
        cursor: { fromX: 16, fromY: 35, toX: 58, toY: 31 },
        imageY: -2,
        zoom: 1.03,
      },
      {
        from: 26,
        duration: 9,
        capture: "sources",
        headline: "Sources are one click away",
        body: "The local help panel shows call-before-going guidance and the approved source list used for the answer.",
        highlight: {
          label: "Sources and local help",
          x: 70,
          y: 10,
          width: 25,
          height: 32,
          tone: "purple",
        },
        cursor: { fromX: 79, fromY: 7, toX: 81, toY: 28 },
        imageY: 0,
        zoom: 1.05,
      },
      {
        from: 35,
        duration: 10,
        capture: "packet",
        headline: "The user leaves prepared",
        body: "The packet frames a safe call script, checklist, and questions for an official agency conversation.",
        highlight: {
          label: "Prep packet",
          x: 70,
          y: 13,
          width: 25,
          height: 42,
          tone: "blue",
        },
        cursor: { fromX: 80, fromY: 8, toX: 78, toY: 36 },
        imageY: 0,
        zoom: 1.03,
      },
    ],
  },
  {
    id: "SfFoodShelterHandoff",
    capturePrefix: "sf",
    title: "San Francisco Food And Shelter Handoff",
    subtitle: "Urgent local help without live availability claims",
    audience: "Synthetic SF adult",
    accent: "#2563eb",
    durationSeconds: DURATION_SECONDS,
    captions: [
      caption(
        "A San Francisco user asks for food today and shelter information, while keeping location details broad.",
        1,
        7,
      ),
      caption(
        "BenefitBridge responds with safe handoff language and keeps live availability claims out of the answer.",
        8,
        15,
      ),
      caption(
        "The chat cards separate immediate local resources from benefit paths, so urgent needs do not get buried.",
        16,
        24,
      ),
      caption(
        "Source links and local resource cards keep the user oriented around official or approved handoffs.",
        25,
        33,
      ),
      caption(
        "The flow is useful because it gives a next call, a checklist, and a safer way to continue.",
        34,
        43,
      ),
    ],
    beats: [
      {
        from: 0,
        duration: 8,
        capture: "initial",
        headline: "Broad details are enough",
        body: "The user can ask for food and shelter help without sharing an exact address or unsafe location.",
        highlight: {
          label: "Chat intake",
          x: 5,
          y: 12,
          width: 28,
          height: 38,
          tone: "blue",
        },
        cursor: { fromX: 14, fromY: 83, toX: 18, toY: 65 },
        imageY: 0,
        zoom: 1.06,
      },
      {
        from: 8,
        duration: 9,
        capture: "chat",
        headline: "No shelter-bed guarantees",
        body: "The response points to handoffs and cautions without claiming live bed or meal availability.",
        highlight: {
          label: "Safety-aware answer",
          x: 5,
          y: 22,
          width: 28,
          height: 54,
          tone: "green",
        },
        cursor: { fromX: 22, fromY: 70, toX: 14, toY: 34 },
        imageY: -6,
        zoom: 1.1,
      },
      {
        from: 17,
        duration: 9,
        capture: "chat",
        headline: "Food, health, cash, shelter paths",
        body: "Benefit paths show what may be worth checking and which facts are still missing.",
        highlight: {
          label: "Prep paths",
          x: 34,
          y: 11,
          width: 34,
          height: 53,
          tone: "amber",
        },
        cursor: { fromX: 16, fromY: 34, toX: 58, toY: 29 },
        imageY: -2,
        zoom: 1.03,
      },
      {
        from: 26,
        duration: 9,
        capture: "sources",
        headline: "Local handoffs stay visible",
        body: "The source panel anchors advice in SFHSA, food bank, access point, and approved source links.",
        highlight: {
          label: "Approved sources",
          x: 70,
          y: 9,
          width: 25,
          height: 37,
          tone: "purple",
        },
        cursor: { fromX: 80, fromY: 7, toX: 80, toY: 27 },
        imageY: 0,
        zoom: 1.05,
      },
      {
        from: 35,
        duration: 10,
        capture: "packet",
        headline: "A clear next step",
        body: "The packet gives call language and prep questions instead of trying to submit or decide anything.",
        highlight: {
          label: "Call script",
          x: 70,
          y: 39,
          width: 25,
          height: 18,
          tone: "blue",
        },
        cursor: { fromX: 80, fromY: 8, toX: 78, toY: 46 },
        imageY: 0,
        zoom: 1.03,
      },
    ],
  },
  {
    id: "SpanishWicPrep",
    capturePrefix: "spanish",
    title: "Spanish And WIC Prep",
    subtitle: "Bilingual intake, missing facts, WIC, food, and health prep",
    audience: "Synthetic Spanish-preference family",
    accent: "#7c3aed",
    durationSeconds: DURATION_SECONDS,
    captions: [
      caption(
        "A Spanish-preference family asks for food, WIC, and health coverage preparation.",
        1,
        7,
      ),
      caption(
        "The chat captures language preference and asks only for broad facts that help route the prep packet.",
        8,
        15,
      ),
      caption(
        "WIC is shown as a path worth checking, with missing facts like child age or pregnancy/postpartum details.",
        16,
        24,
      ),
      caption(
        "Official links remain visible, so the user can move from guidance to trusted agency sources.",
        25,
        33,
      ),
      caption(
        "The demo ends with a safe packet: source-backed, practical, and explicit that agencies decide eligibility.",
        34,
        43,
      ),
    ],
    beats: [
      {
        from: 0,
        duration: 8,
        capture: "initial",
        headline: "Start in the user's language",
        body: "The user can express Spanish preference and the help areas they want to prepare for.",
        highlight: {
          label: "Spanish chat prompt",
          x: 5,
          y: 12,
          width: 28,
          height: 38,
          tone: "purple",
        },
        cursor: { fromX: 14, fromY: 83, toX: 18, toY: 65 },
        imageY: 0,
        zoom: 1.06,
      },
      {
        from: 8,
        duration: 9,
        capture: "chat",
        headline: "Question cards keep intake safe",
        body: "The response asks for missing facts without asking for documents, SSNs, or credentials.",
        highlight: {
          label: "Question set",
          x: 5,
          y: 18,
          width: 28,
          height: 42,
          tone: "green",
        },
        cursor: { fromX: 22, fromY: 70, toX: 14, toY: 34 },
        imageY: -5,
        zoom: 1.1,
      },
      {
        from: 17,
        duration: 9,
        capture: "chat",
        headline: "WIC is framed carefully",
        body: "The app points to WIC prep while showing missing facts and avoiding certainty.",
        highlight: {
          label: "WIC path",
          x: 34,
          y: 43,
          width: 34,
          height: 22,
          tone: "amber",
        },
        cursor: { fromX: 16, fromY: 34, toX: 53, toY: 52 },
        imageY: -2,
        zoom: 1.03,
      },
      {
        from: 26,
        duration: 9,
        capture: "sources",
        headline: "Official links remain close",
        body: "The Sources tab keeps WIC, CalFresh, BenefitsCal, and Medi-Cal links visible for the next step.",
        highlight: {
          label: "Official source links",
          x: 70,
          y: 9,
          width: 25,
          height: 38,
          tone: "purple",
        },
        cursor: { fromX: 80, fromY: 7, toX: 80, toY: 27 },
        imageY: 0,
        zoom: 1.05,
      },
      {
        from: 35,
        duration: 10,
        capture: "packet",
        headline: "Preparation, not determination",
        body: "The packet gives checklists and questions while keeping agency decisions and privacy boundaries clear.",
        highlight: {
          label: "Packet summary",
          x: 70,
          y: 13,
          width: 25,
          height: 42,
          tone: "blue",
        },
        cursor: { fromX: 80, fromY: 8, toX: 78, toY: 36 },
        imageY: 0,
        zoom: 1.03,
      },
    ],
  },
  {
    id: "ConversationAtlasDemo",
    capturePrefix: "sanjose",
    title: "Conversation Atlas Demo",
    subtitle: "Sidepanel chat, maps, official sources, packet prep, and Spanish UI",
    audience: "Public demo scenario",
    accent: "#0f766e",
    durationSeconds: ATLAS_DURATION_SECONDS,
    captions: [
      caption(
        "The atlas starts with a persistent chat rail: broad facts and needs become structured prep context.",
        1,
        5.5,
      ),
      caption(
        "Local resources can show a map embed when configured, or safe Google Maps links when not.",
        6,
        11,
      ),
      caption(
        "Official source links stay close to each benefit path so the user can verify next steps.",
        11.5,
        17,
      ),
      caption(
        "Prepare Packet turns the conversation into a checklist and call script for an official agency conversation.",
        17.5,
        23,
      ),
      caption(
        "The same workspace can switch the page and chat controls into Spanish without changing safety boundaries.",
        23.5,
        27.5,
      ),
    ],
    beats: [
      {
        from: 0,
        duration: 5.5,
        capture: "chat",
        headline: "Chat stays beside every section",
        body: "The right rail keeps the agent conversation visible while the user prepares sources, resources, and packet details.",
        highlight: {
          label: "Agent sidepanel",
          x: 74,
          y: 8,
          width: 22,
          height: 76,
          tone: "blue",
        },
        cursor: { fromX: 82, fromY: 82, toX: 86, toY: 52 },
        imageY: -2,
        zoom: 1.02,
      },
      {
        from: 5.5,
        duration: 5.5,
        capture: "resources",
        headline: "Maps are safe by default",
        body: "Resources render a map panel only from curated organization and jurisdiction fields, with safe link-out fallback.",
        highlight: {
          label: "Map fallback",
          x: 5,
          y: 35,
          width: 52,
          height: 32,
          tone: "green",
        },
        cursor: { fromX: 48, fromY: 8, toX: 30, toY: 54 },
        imageY: 0,
        zoom: 1.02,
      },
      {
        from: 11,
        duration: 6,
        capture: "sources",
        headline: "Sources stay attached",
        body: "CalFresh, BenefitsCal, Medi-Cal, WIC, and utility help links remain visible for verification.",
        highlight: {
          label: "Official sources",
          x: 5,
          y: 34,
          width: 52,
          height: 32,
          tone: "purple",
        },
        cursor: { fromX: 48, fromY: 8, toX: 30, toY: 50 },
        imageY: 0,
        zoom: 1.02,
      },
      {
        from: 17,
        duration: 6,
        capture: "packet",
        headline: "Packet closes the loop",
        body: "The handoff is a checklist, question set, and call script, not an eligibility decision.",
        highlight: {
          label: "Prep packet",
          x: 5,
          y: 32,
          width: 52,
          height: 38,
          tone: "amber",
        },
        cursor: { fromX: 48, fromY: 8, toX: 30, toY: 50 },
        imageY: 0,
        zoom: 1.02,
      },
      {
        from: 23,
        duration: 5,
        capture: "spanish",
        headline: "The workspace localizes",
        body: "The page, chat placeholder, and packet actions switch to Spanish while keeping the same safety copy.",
        highlight: {
          label: "Spanish UI",
          x: 6,
          y: 8,
          width: 64,
          height: 22,
          tone: "blue",
        },
        cursor: { fromX: 88, fromY: 8, toX: 64, toY: 14 },
        imageY: 0,
        zoom: 1.02,
      },
    ],
  },
];

export const flowById = Object.fromEntries(flows.map((flow) => [flow.id, flow])) as Record<
  DemoFlow["id"],
  DemoFlow
>;
