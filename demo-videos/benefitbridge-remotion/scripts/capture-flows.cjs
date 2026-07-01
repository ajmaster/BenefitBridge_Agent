#!/usr/bin/env node

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");

const demoRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(demoRoot, "../..");
const captureDir = path.join(demoRoot, "public", "captures");
const frontendPlaywright = path.join(
  repoRoot,
  "frontend",
  "node_modules",
  "@playwright",
  "test",
);
const baseUrl = process.env.BENEFITBRIDGE_DEMO_URL || "http://127.0.0.1:8091";
const shouldStartServer = !process.env.BENEFITBRIDGE_DEMO_URL;

const flows = [
  {
    prefix: "sanjose",
    prompt:
      "I am in San Jose with 3 people and need food, health coverage, utility help, and WIC prep.",
    requiredText: [
      "Agent conversation",
      "Paths Worth Checking",
      "Local Handoffs",
      "Call before going",
      "Official agencies decide eligibility",
    ],
  },
  {
    prefix: "sf",
    prompt:
      "I am in San Francisco and need food today and shelter tonight. I have no income and I am sleeping in my car.",
    requiredText: [
      "Agent conversation",
      "Local Handoffs",
      "Call before going",
      "Official Source Links",
      "Official agencies decide eligibility",
    ],
  },
  {
    prefix: "spanish",
    prompt:
      "Prefiero espanol. Estoy en San Jose con dos ninos y necesito comida, WIC y cobertura medica.",
    requiredText: [
      "Conversacion del agente",
      "Paths Worth Checking",
      "Official Source Links",
      // The English "Official agencies decide eligibility" boundary reminder is now
      // frontend-localized (`app/i18n.ts`'s `boundary[0]`), unlike the a2ui template
      // titles above (those come from `app/services/chat_workflow.py` and are never
      // translated). In Spanish mode the reminder renders as "Las agencias oficiales
      // deciden elegibilidad y montos." - assert the Spanish substring instead.
      "agencias oficiales deciden elegibilidad",
    ],
    language: "es",
  },
];

// `WorkspaceSidebarNav.tsx`'s sidebar renders one `<Link>` per section, labelled per the
// active locale, and each route is client-navigated (no full reload) - which matters
// because `BenefitBridgeProvider` (the chat/resources/packet state) lives once at the
// `(workspace)` layout level and is NOT persisted anywhere (no localStorage/sessionStorage
// beyond the selected language, per `frontend/lib/locale-storage.ts`). A hard
// `page.goto(...)` between sections would force a full page reload and reset that state,
// so the resources/sources/packet captures would show generic fallback demo data instead
// of the content actually produced by each flow's chat turn (confirmed by
// `frontend/tests/e2e/workspace.spec.ts`'s "chat history persists across section
// navigation" test, which relies on clicking the sidebar `Link`s, not `page.goto`).
// So: enter each flow via `page.goto` (per the brief - there is no session state yet to
// preserve at that point), then navigate the rest of the way by clicking the real sidebar
// links, exactly as a user would.
const sectionMeta = {
  chat: { path: /\/app\/chat\/?$/, label: { en: "Chat", es: "Chat" } },
  prepare: { path: /\/app\/prepare\/?$/, label: { en: "Prepare", es: "Preparar" } },
  sources: { path: /\/app\/sources\/?$/, label: { en: "Sources", es: "Fuentes" } },
  resources: { path: /\/app\/resources\/?$/, label: { en: "Resources", es: "Recursos" } },
  packet: { path: /\/app\/packet\/?$/, label: { en: "Packet", es: "Paquete" } },
};

const gotoSection = async (page, key, locale) => {
  const meta = sectionMeta[key];
  await page.getByRole("link", { name: meta.label[locale], exact: true }).click();
  await page.waitForURL(meta.path);
};

// `PrepareSection.tsx`'s three Select fields (synthetic profile, language, housing status)
// have no accessible name - the shadcn `Label` above each isn't wired via `htmlFor`/
// `aria-labelledby` to its trigger - so `data-testid="language-select"` (which no longer
// exists anywhere in the redesigned workspace) can't be swapped for a named lookup.
// `frontend/tests/e2e/workspace.spec.ts`'s "language selector in Prepare updates section
// copy and chat controls" test hits the same wall and resolves it with a positional
// selector (DOM order is stable: profile, then language, then housing status), so this
// reuses that exact approach: open `/app/prepare/`, click the 2nd combobox, pick "Espanol".
const selectSpanish = async (page) => {
  await page.getByRole("combobox").nth(1).click();
  await page.getByRole("option", { name: "Espanol" }).click();
};

const main = async () => {
  fs.mkdirSync(captureDir, { recursive: true });
  const { chromium } = require(frontendPlaywright);
  const server = shouldStartServer ? startServer() : null;

  try {
    await waitFor(`${baseUrl}/healthz`, 30000);
    const browser = await chromium.launch({ headless: true });
    const manifest = {
      capturedAt: new Date().toISOString(),
      baseUrl,
      flows: [],
    };

    for (const flow of flows) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 1,
      });
      let locale = flow.language === "es" ? "es" : "en";

      // Chat now lives under `/app/chat/`, not the bare base URL (the old single-page
      // dashboard at `/` is gone - `/` is now the marketing landing page).
      await page.goto(`${baseUrl}/app/chat/`, { waitUntil: "networkidle" });

      if (flow.language === "es") {
        // No chat/resources/packet state exists yet, so a full detour through Prepare
        // (still client-navigated, see `gotoSection`) is free here.
        await gotoSection(page, "prepare", "en");
        await selectSpanish(page);
        await gotoSection(page, "chat", "es");
      }

      await page.getByTestId("chat-input").fill(flow.prompt);
      await capture(page, `${flow.prefix}-initial.png`);
      await page.getByRole("button", { name: locale === "es" ? "Enviar" : "Send" }).click();
      await page.waitForSelector('[data-testid="a2ui-card"]', { timeout: 15000 });
      await assertPage(page, flow.requiredText);
      await capture(page, `${flow.prefix}-chat.png`);

      await gotoSection(page, "resources", locale);
      // `ResourcesSection.tsx` overrides `MapEmbedPanel`'s default `map-panel` testid to
      // `bay-map-panel` (kept distinct from `BayAreaSection.tsx`'s own `map-panel`).
      await page.waitForSelector('[data-testid="bay-map-panel"]', { timeout: 5000 });
      await page.waitForTimeout(300);
      await capture(page, `${flow.prefix}-resources.png`);

      await gotoSection(page, "sources", locale);
      await page.waitForTimeout(300);
      await capture(page, `${flow.prefix}-sources.png`);

      await gotoSection(page, "packet", locale);
      await page.waitForSelector('[data-testid="packet-panel"]', { timeout: 5000 });
      await page.waitForTimeout(300);
      await capture(page, `${flow.prefix}-packet.png`);

      if (locale !== "es") {
        await gotoSection(page, "prepare", locale);
        await selectSpanish(page);
        locale = "es";
        await gotoSection(page, "packet", locale);
      }
      await page.waitForTimeout(300);
      await capture(page, `${flow.prefix}-spanish.png`);

      await page.close();

      manifest.flows.push({
        prefix: flow.prefix,
        prompt: flow.prompt,
        captures: [
          `${flow.prefix}-initial.png`,
          `${flow.prefix}-chat.png`,
          `${flow.prefix}-resources.png`,
          `${flow.prefix}-sources.png`,
          `${flow.prefix}-packet.png`,
          `${flow.prefix}-spanish.png`,
        ],
      });
    }

    await browser.close();
    fs.writeFileSync(
      path.join(captureDir, "capture-manifest.json"),
      JSON.stringify(manifest, null, 2),
    );
    console.log(`Captured ${manifest.flows.length} flows to ${captureDir}`);
  } finally {
    if (server) {
      server.kill("SIGINT");
    }
  }
};

const startServer = () => {
  const child = spawn(
    "env",
    [
      "UV_CACHE_DIR=.uv-cache",
      // The redesigned sidebar (`WorkspaceSidebarNav.tsx`) renders a `<Link>` per section,
      // and Next.js prefetches every visible `<Link>`'s route data automatically. Combined
      // with 3 flows x ~6 navigations each, that comfortably blows past the app's default
      // `RATE_LIMIT_REQUESTS_PER_MINUTE=80` (`app/fast_api_app.py`) for the single
      // `127.0.0.1` client, producing spurious 429s during capture. This only raises the
      // limit for this script's own ephemeral capture server via the existing env var - no
      // application code changes.
      "RATE_LIMIT_REQUESTS_PER_MINUTE=1000",
      "uv",
      "run",
      "uvicorn",
      "app.fast_api_app:app",
      "--host",
      "127.0.0.1",
      "--port",
      "8091",
    ],
    {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  return child;
};

const waitFor = async (url, timeoutMs) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await canGet(url)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const canGet = (url) =>
  new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(1500, () => {
      request.destroy();
      resolve(false);
    });
  });

const capture = async (page, filename) => {
  const filePath = path.join(captureDir, filename);
  await page.screenshot({ path: filePath, fullPage: true });
  const stats = fs.statSync(filePath);
  if (stats.size < 10000) {
    throw new Error(`Capture too small: ${filename}`);
  }
};

const assertPage = async (page, requiredText) => {
  const text = await page.locator("body").innerText();
  const cardCount = await page.locator('[data-testid="a2ui-card"]').count();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  if (cardCount < 3) {
    throw new Error(`Expected at least 3 A2UI cards, saw ${cardCount}`);
  }
  if (overflow) {
    throw new Error("Captured page has horizontal overflow");
  }
  for (const required of requiredText) {
    if (!text.includes(required)) {
      throw new Error(`Missing expected capture text: ${required}`);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
