import { expect, test } from "@playwright/test";

const workspaceSections = ["Chat", "Prepare", "Sources", "Resources", "Packet", "California"];

test("root route renders the landing page front door", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Ask AidAtlasCA. Find help nearby." }),
  ).toBeVisible();
  await expect(page.getByText("Voice agent")).toBeVisible();
  await expect(page.getByText("Maps", { exact: true })).toBeVisible();
  await expect(page.getByText("Places handoffs")).toBeVisible();
  await expect(page.getByText("Calendar reminders", { exact: true })).toBeVisible();
  await expect(page.getByTestId("chat-sidepanel")).toHaveCount(0);
});

test("landing page primary CTA opens the workspace chat shell", async ({ page }) => {
  await page.goto("/");

  const cta = page.getByRole("link", { name: "Ask AidAtlasCA" }).first();
  await expect(cta).toBeVisible();
  await cta.click();
  await page.waitForURL(/\/app\/chat\/?$/);

  await expect(page.getByTestId("chat-main-surface")).toBeVisible();
  await expect(page.getByTestId("chat-rail-surface")).toHaveCount(0);
  await expect(page.getByTestId("chat-input")).toHaveValue("");
  await expect(page.getByRole("heading", { name: "Agent conversation" })).toBeVisible();

  for (const section of workspaceSections) {
    await expect(page.getByRole("link", { name: section, exact: true })).toBeVisible();
  }
});

test("sources remain reachable after entering from the landing page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Ask AidAtlasCA" }).first().click();
  await page.waitForURL(/\/app\/chat\/?$/);

  await page.getByRole("link", { name: "Sources", exact: true }).click();
  await page.waitForURL(/\/app\/sources\/?$/);

  await expect(page.getByRole("heading", { name: "Official source trail" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Approved source library" })).toBeVisible();
  await expect(page.getByText("77 / 77 approved sources")).toBeVisible();
});

test("chat answer appears before compact support cards", async ({ page }) => {
  const finalResponse = {
    type: "final",
    payload: {
      route: "packet_ready",
      message:
        "For San Jose, start with CalFresh and Medi-Cal preparation. Keep your question focused on documents and local handoff steps; official agencies decide eligibility and amounts.",
      events: ["chat_received", "deterministic_graph"],
      snapshot: {
        language: "en",
        location_text: "San Jose, CA",
        children_ages: [],
        needs: ["food", "healthcare"],
        housing_status: "unknown",
        utilities_need: false,
        food_need_today: false,
        safety_sensitive: false,
      },
      snapshot_patch: { location_text: "San Jose, CA", needs: ["food", "healthcare"] },
      next_questions: ["How many people are in the household?"],
      ui_templates: [
        {
          id: "facts",
          type: "fact_summary",
          title: "Conversation Intake",
          tone: "info",
          items: [
            { label: "Location", value: "San Jose, CA" },
            { label: "Needs", value: "food, healthcare" },
          ],
          actions: [],
          citations: [],
        },
        {
          id: "paths",
          type: "benefit_paths",
          title: "Benefit paths",
          tone: "accent",
          items: [{ title: "CalFresh prep" }, { title: "Medi-Cal prep" }],
          actions: [{ type: "open_sources", label: "Open sources" }],
          citations: [],
        },
        {
          id: "resources",
          type: "local_resources",
          title: "Local resources",
          tone: "source",
          items: [{ title: "Santa Clara County handoff" }],
          actions: [{ type: "open_resources", label: "Open resources" }],
          citations: [],
        },
        {
          id: "sources",
          type: "source_links",
          title: "Source links",
          tone: "source",
          items: [],
          actions: [{ type: "open_sources", label: "Open sources" }],
          citations: [
            {
              source_id: "calfresh_state",
              source_title: "California CalFresh official site",
              url: "https://www.cdss.ca.gov/calfresh",
            },
          ],
        },
      ],
      resources: [],
      validation: { pass: true, failures: [], blocking_failures: [] },
      response_mode: "deterministic_fallback",
      llm_invoked: false,
      model_name: "gemini-2.5-flash",
      fallback_reason: "Gemini chat synthesis is not configured for this local run.",
      fallback_code: "llm_disabled",
      diagnostics: {
        response_mode: "deterministic_fallback",
        llm_invoked: false,
        model_name: "gemini-2.5-flash",
        fallback_reason: "Gemini chat synthesis is not configured for this local run.",
        fallback_code: "llm_disabled",
        graph_events: ["chat_received", "deterministic_graph"],
      },
    },
  };
  await page.route("**/api/chat/stream", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "access-control-allow-origin": "*", "content-type": "text/event-stream" },
      body: [
        'data: {"type":"delta","payload":{"text":"For San Jose, start with CalFresh and Medi-Cal preparation."}}',
        `data: ${JSON.stringify(finalResponse)}`,
        "",
      ].join("\n\n"),
    });
  });
  await page.goto("/app/chat/");
  await page.waitForURL(/\/app\/chat\/?$/);

  await page
    .getByTestId("chat-input")
    .fill("I am in San Jose and need food and Medi-Cal prep.");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByTestId("chat-diagnostics")).toHaveCount(0);
  await expect(page.getByTestId("chat-main-surface")).toContainText(/San Jose|food|Medi-Cal/i);
  await expect(page.getByTestId("chat-support-drawer")).toHaveCount(0);
  await page.getByTestId("chat-support-toggle").click();
  await expect(page.getByTestId("chat-support-drawer")).toBeVisible();

  const cardTypes = await page
    .getByTestId("chat-support-drawer")
    .getByTestId("a2ui-card-type")
    .evaluateAll((types) => types.map((type) => type.textContent?.trim()));
  expect(cardTypes).toEqual(
    expect.arrayContaining([
      "fact summary",
      "benefit paths",
      "local resources",
      "source links",
    ]),
  );
  expect(cardTypes.every((type) =>
    [
      "fact summary",
      "question set",
      "benefit paths",
      "local resources",
      "source links",
      "privacy notice",
      "safety handoff",
      "route status",
      "voice status",
    ].includes(type ?? ""),
  )).toBe(true);
  expect(cardTypes).not.toEqual(
    expect.arrayContaining([
      "packet summary",
      "document kit",
      "document summary",
      "document checklist",
      "caseworker questions",
      "call script",
      "local handoff sheet",
      "source sheet",
    ]),
  );
});

test("landing page supports mobile layout without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );

  expect(overflow).toBe(false);
  await expect(
    page.getByRole("heading", { name: "Ask AidAtlasCA. Find help nearby." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Ask AidAtlasCA" }).first()).toBeVisible();
});
