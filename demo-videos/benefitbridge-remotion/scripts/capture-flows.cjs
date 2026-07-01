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
      "Official agencies decide eligibility",
    ],
    language: "es",
  },
];

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
      await page.goto(baseUrl, { waitUntil: "networkidle" });
      if (flow.language === "es") {
        await page.getByTestId("language-select").selectOption("es");
      }
      await page.getByTestId("chat-input").fill(flow.prompt);
      await capture(page, `${flow.prefix}-initial.png`);
      await page.getByRole("button", { name: flow.language === "es" ? "Enviar" : "Send" }).click();
      await page.waitForSelector('[data-testid="a2ui-card"]', { timeout: 15000 });
      await assertPage(page, flow.requiredText);
      await capture(page, `${flow.prefix}-chat.png`);
      await page.getByTestId("nav-resources").click();
      await page.waitForSelector('[data-testid="map-panel"]', { timeout: 5000 });
      await page.waitForTimeout(300);
      await capture(page, `${flow.prefix}-resources.png`);
      await page.getByTestId("nav-sources").click();
      await page.waitForTimeout(300);
      await capture(page, `${flow.prefix}-sources.png`);
      await page.getByTestId("nav-packet").click();
      await page.waitForSelector('[data-testid="packet-panel"]', { timeout: 5000 });
      await page.waitForTimeout(300);
      await capture(page, `${flow.prefix}-packet.png`);
      await page.getByTestId("language-select").selectOption("es");
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
