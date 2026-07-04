import { expect, test } from "@playwright/test";

// Replaces `dashboard.spec.ts`, which drove the old `BenefitBridgeDashboard`
// monolith mounted at `/`. That monolith is retired; its behaviors now live
// across the `/app/*` workspace routes (`WorkspaceShell` + per-section pages).
// Coverage map from the old spec's four tests, reattributed here:
//
// - "renders Conversation Atlas shell with required boundaries" ->
//   "workspace shell renders sidebar sections, chat side panel, and boundary
//   reminders" (below). Two pieces of the old assertion have no live home in
//   the new component tree and are intentionally not reproduced literally:
//   the `workspace-status` testid (no component renders the controller's
//   `notice` state anymore) and the `language-select` testid (language is now
//   changed via the Prepare section's Select control, covered in the language
//   test below).
// - "prepare packet visibly transitions into packet workspace" ->
//   "prepare packet transitions into the packet workspace" (below). Same
//   substitution: no `workspace-status` text exists, so the assertion checks
//   the packet content itself renders instead of a status string.
// - "language selector updates page and chat controls" ->
//   "language selector in Prepare updates section copy and chat controls"
//   (below), reattributed to the real language control (Prepare section's
//   Select, not a native <select>).
// - "resource maps degrade to safe Google Maps links without an embed key" ->
//   "resource maps render a Google Maps embed or safe fallback" (below).
// - "supports mobile Conversation Atlas layout without horizontal overflow"
//   -> "supports mobile workspace layout without horizontal overflow" below.
//
// Plus one new test (not in the old spec): chat history persisting across
// section navigation, since `BenefitBridgeProvider` now lives at the
// `(workspace)` layout level so the controller survives route changes.

test("workspace shell renders sidebar sections, main chat surface, and boundary reminders", async ({
  page,
}) => {
  await page.goto("/app/chat/");

  await expect(page.getByTestId("chat-main-surface")).toBeVisible();
  await expect(page.getByTestId("chat-rail-surface")).toHaveCount(0);
  await expect(page.getByTestId("chat-input")).toBeVisible();

  for (const section of ["Chat", "Prepare", "Sources", "Resources", "Packet", "California"]) {
    await expect(page.getByRole("link", { name: section, exact: true })).toBeVisible();
  }

  await expect(
    page.getByText("Official agencies decide eligibility and amounts.").first(),
  ).toBeVisible();
  await expect(
    page.getByText("Use city/county/ZIP only, not exact addresses.").first(),
  ).toBeVisible();
  await expect(
    page
      .getByText("Do not enter SSNs, credentials, case numbers, cards, or real documents.")
      .first(),
  ).toBeVisible();
  await expect(page.getByText("Local details can change. Call before going.").first()).toBeVisible();
});

test("build prep documents transitions into the Prep Documents workspace", async ({ page }) => {
  await page.goto("/app/prepare/");

  await expect(page.getByRole("heading", { name: "Document Studio" })).toBeVisible();
  await expect(page.getByTestId("prepare-button")).toContainText("Build prep documents");
  await page.getByTestId("prepare-button").click();
  await page.waitForURL(/\/app\/packet\/?$/);

  await expect(page.getByTestId("packet-panel")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Six practical documents, built from one conversation." }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Document kit" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Print / save PDF" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy call script" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add reminders to calendar (.ics)" })).toBeVisible();
  await expect(page.getByTestId("calendar-reminder-editor")).toBeVisible();
  await expect(page.getByTestId("calendar-reminder-row").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Download selected reminders" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export packet" })).toHaveCount(0);
});

test("language selector in Prepare updates section copy and chat controls", async ({ page }) => {
  await page.goto("/app/prepare/");

  await expect(page.getByTestId("chat-rail-surface")).toBeVisible();
  await expect(page.getByTestId("chat-input")).toHaveAttribute(
    "placeholder",
    "Type your question or use Speak...",
  );
  await expect(page.getByRole("button", { name: /^(Speak|Voice off)$/ })).toBeVisible();

  await page.getByRole("combobox", { name: "Language" }).click();
  await page.getByRole("option", { name: "Espanol" }).click();

  await expect(
    page.getByRole("heading", { name: "Estudio de documentos" }),
  ).toBeVisible();
  await expect(page.getByTestId("prepare-button")).toContainText(
    "Crear documentos de preparacion",
  );

  await expect(page.getByTestId("chat-input")).toHaveAttribute(
    "placeholder",
    "Escribe tu pregunta o usa Hablar...",
  );
  await expect(page.getByRole("button", { name: "Enviar" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^(Hablar|Voz apagada)$/ })).toBeVisible();
});

test("resource maps render a Google Maps embed or safe fallback", async ({ page }) => {
  await page.goto("/app/resources/");

  const mapPanel = page.getByTestId("resource-map-panel");
  await expect(mapPanel).toBeVisible();
  const iframeCount = await mapPanel.locator("iframe").count();
  if (iframeCount > 0) {
    await expect(mapPanel.locator("iframe").first()).toBeVisible();
  } else {
    const fallback = page.getByTestId("resource-map-fallback");
    await expect(fallback).toContainText("Map preview");
    await expect(fallback).toContainText(/Maps Embed (is disabled|is not enabled)/);
  }
  await expect(page.getByRole("link", { name: /Open in Google Maps/i }).first()).toBeVisible();
});

test("california explorer renders statewide county filters and locator handoffs", async ({
  page,
}) => {
  await page.goto("/app/california/");

  await expect(page.getByRole("heading", { name: "California Resource Explorer" })).toBeVisible();
  await expect(page.getByTestId("california-map-panel")).toBeVisible();
  await expect(page.getByText("58").first()).toBeVisible();
  await expect(page.getByTestId("california-county-card")).toHaveCount(58);

  await page.getByTestId("california-search").fill("Los Angeles");
  await expect(page.getByTestId("california-county-card")).toHaveCount(1);
  await expect(page.getByTestId("california-county-card").first()).toContainText(
    "Los Angeles County",
  );
  await expect(page.getByTestId("california-resource-grid")).toContainText(
    "Los Angeles County Local handoffs",
  );
  await expect(page.getByTestId("california-resource-grid")).toContainText(
    "Statewide locator handoff",
  );
  await expect(page.getByTestId("california-resource-grid")).toContainText(
    "Call before going to confirm current availability.",
  );

  await page.getByTestId("california-search").fill("San Diego");
  await expect(page.getByTestId("california-county-card")).toHaveCount(1);
  await expect(page.getByTestId("california-county-card").first()).toContainText(
    "San Diego County",
  );

  await page.getByTestId("california-search").fill("Fresno");
  await expect(page.getByTestId("california-county-card")).toHaveCount(1);
  await expect(page.getByTestId("california-county-card").first()).toContainText(
    "Fresno County",
  );

  await page.getByTestId("california-search").fill("Santa Clara");
  await expect(page.getByTestId("california-county-card")).toHaveCount(1);
  await expect(page.getByTestId("california-county-card").first()).toContainText(
    "Santa Clara County",
  );
});

test("bay area compatibility route renders the california explorer", async ({ page }) => {
  await page.goto("/app/bay-area/");

  await expect(page.getByRole("heading", { name: "California Resource Explorer" })).toBeVisible();
  await expect(page.getByRole("link", { name: "California", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Bay Area", exact: true })).toHaveCount(0);
});

test("sources tab shows current citations and the full approved source library", async ({ page }) => {
  await page.goto("/app/sources/");

  await expect(page.getByRole("heading", { name: "Used in this conversation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Approved source library" })).toBeVisible();
  await expect(page.getByText("77 / 77 approved sources")).toBeVisible();

  await page.getByLabel("Filter approved sources").fill("WIC");
  await expect(page.getByText(/\/ 77 approved sources/)).toBeVisible();
  await expect(page.getByText("No approved sources match this filter.")).toHaveCount(0);
});

test("supports mobile workspace layout without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/app/chat/");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );

  expect(overflow).toBe(false);
  await expect(page.getByRole("link", { name: "Prepare", exact: true })).toBeVisible();
  await expect(page.getByTestId("chat-main-surface")).toBeVisible();
  await expect(page.getByTestId("chat-rail-surface")).toHaveCount(0);
});

test("chat history persists across section navigation", async ({ page }) => {
  await page.goto("/app/chat/");
  const message = "I need help with food assistance";
  await page.getByTestId("chat-input").fill(message);
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByTestId("chat-main-surface")).toContainText(message);
  await expect(page.getByTestId("chat-main-surface")).toContainText(/city|county|ZIP|food/i);

  await page.getByRole("link", { name: "Prepare", exact: true }).click();
  await page.waitForURL(/\/app\/prepare\/?$/);
  await expect(page.getByTestId("chat-rail-surface")).toContainText(message);

  await page.getByRole("link", { name: "Chat", exact: true }).click();
  await page.waitForURL(/\/app\/chat\/?$/);

  await expect(page.getByTestId("chat-main-surface")).toContainText(message);
});

test("desktop chat response stays inside the conversation scroll region", async (
  { page },
  testInfo,
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop-only scroll containment check.");
  const finalResponse = {
    type: "final",
    payload: {
      route: "packet_ready",
      message: Array.from({ length: 18 }, (_, index) =>
        `Step ${index + 1}: For Fresno, start with CalFresh preparation and ask the county office what documents they want before you go. Official agencies decide eligibility and amounts, and local resource details can change.`,
      ).join("\n"),
      events: ["chat_received", "deterministic_graph"],
      snapshot: {
        language: "en",
        location_text: "Fresno, CA",
        children_ages: [],
        needs: ["food"],
        housing_status: "unknown",
        utilities_need: false,
        food_need_today: false,
        safety_sensitive: false,
      },
      snapshot_patch: { location_text: "Fresno, CA", needs: ["food"] },
      next_questions: ["How many people are in the household?"],
      ui_templates: [
        {
          id: "facts",
          type: "fact_summary",
          title: "Conversation Intake",
          tone: "info",
          items: [
            { label: "Location", value: "Fresno, CA" },
            { label: "Needs", value: "food" },
            { label: "Household", value: "Needed" },
          ],
          actions: [],
          citations: [],
        },
        {
          id: "paths",
          type: "benefit_paths",
          title: "Benefit paths",
          tone: "accent",
          items: Array.from({ length: 8 }, (_, index) => ({
            title: `Food prep path ${index + 1}`,
            body: "Ask what documents to bring, then call before going to confirm current availability.",
            badges: ["likely worth checking"],
          })),
          actions: [{ type: "open_sources", label: "Open sources" }],
          citations: [
            {
              source_id: "calfresh_state",
              source_title: "California CalFresh official site",
              url: "https://www.cdss.ca.gov/calfresh",
            },
          ],
        },
        {
          id: "resources",
          type: "local_resources",
          title: "Local handoffs",
          tone: "source",
          items: Array.from({ length: 6 }, (_, index) => ({
            title: `Fresno locator ${index + 1}`,
            subtitle: "Statewide locator handoff",
            body: "Call before going to confirm current availability.",
          })),
          actions: [{ type: "open_resources", label: "Open resources" }],
          citations: [],
        },
      ],
      packet: undefined,
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
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" },
      });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { "access-control-allow-origin": "*", "content-type": "text/event-stream" },
      body: [
        'data: {"type":"status","payload":{"message":"Checking privacy, sources, and answer mode.","response_mode":"deterministic_fallback"}}',
        'data: {"type":"delta","payload":{"text":"For Fresno, start with CalFresh preparation."}}',
        `data: ${JSON.stringify(finalResponse)}`,
        "",
      ].join("\n\n"),
    });
  });
  await page.setViewportSize({ width: 1440, height: 720 });
  await page.goto("/app/chat/");

  await page
    .getByTestId("chat-input")
    .fill("I live in Fresno and need help with food benefits. What should I do next?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByTestId("chat-diagnostics")).toHaveCount(0);
  await expect(page.getByTestId("chat-support-drawer")).toHaveCount(0);
  await expect(page.getByTestId("chat-support-toggle")).toBeVisible();

  const metrics = await page.evaluate(() => {
    const scrollRegion = document.querySelector('[data-testid="chat-scroll-region"]');
    const composer = document.querySelector('[data-testid="chat-composer"]');
    const regionRect = scrollRegion?.getBoundingClientRect();
    const composerRect = composer?.getBoundingClientRect();
    return {
      windowScrollY: window.scrollY,
      documentScrollable: document.documentElement.scrollHeight > window.innerHeight + 8,
      scrollRegion: scrollRegion
        ? {
            clientHeight: scrollRegion.clientHeight,
            scrollHeight: scrollRegion.scrollHeight,
          }
        : null,
      composerBottom: composerRect?.bottom ?? 0,
      viewportHeight: window.innerHeight,
      regionBottom: regionRect?.bottom ?? 0,
    };
  });

  expect(metrics.windowScrollY).toBe(0);
  expect(metrics.documentScrollable).toBe(false);
  expect(metrics.scrollRegion).not.toBeNull();
  expect(metrics.scrollRegion!.scrollHeight).toBeGreaterThan(metrics.scrollRegion!.clientHeight);
  expect(metrics.composerBottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
  expect(metrics.regionBottom).toBeLessThanOrEqual(metrics.composerBottom);
});

test("desktop chat preserves user scroll position until jump to latest", async (
  { page },
  testInfo,
) => {
  test.skip(testInfo.project.name !== "desktop", "Desktop-only scroll anchoring check.");
  const finalResponse = {
    type: "final",
    payload: {
      route: "packet_ready",
      message: Array.from({ length: 40 }, (_, index) =>
        `Step ${index + 1}: Ask the county office what documents they want before you go.`,
      ).join("\n"),
      events: ["chat_received", "deterministic_graph"],
      snapshot: {
        language: "en",
        location_text: "Fresno, CA",
        children_ages: [],
        needs: ["food"],
        housing_status: "unknown",
        utilities_need: false,
        food_need_today: false,
        safety_sensitive: false,
      },
      snapshot_patch: { location_text: "Fresno, CA", needs: ["food"] },
      next_questions: [],
      ui_templates: [],
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
        'data: {"type":"delta","payload":{"text":"Here are the next steps."}}',
        `data: ${JSON.stringify(finalResponse)}`,
        "",
      ].join("\n\n"),
    });
  });
  await page.setViewportSize({ width: 1440, height: 720 });
  await page.goto("/app/chat/");
  await page.getByTestId("chat-input").fill("I need food help in Fresno");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByTestId("chat-main-surface")).toContainText("Step 40");

  const beforeSecondTurn = await page.evaluate(() => {
    const scrollRegion = document.querySelector('[data-testid="chat-scroll-region"]');
    if (!scrollRegion) return null;
    scrollRegion.scrollTop = 0;
    scrollRegion.dispatchEvent(new Event("scroll", { bubbles: true }));
    return { scrollTop: scrollRegion.scrollTop };
  });
  expect(beforeSecondTurn?.scrollTop).toBe(0);
  await expect(page.getByTestId("jump-to-latest")).toBeVisible();

  await page.getByTestId("chat-input").fill("What should I ask when I call?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByTestId("jump-to-latest")).toBeVisible();

  const whileReading = await page.evaluate(() => {
    const scrollRegion = document.querySelector('[data-testid="chat-scroll-region"]');
    return scrollRegion?.scrollTop ?? -1;
  });
  expect(whileReading).toBeLessThan(40);

  await page.getByTestId("jump-to-latest").click();
  const afterJump = await page.evaluate(() => {
    const scrollRegion = document.querySelector('[data-testid="chat-scroll-region"]');
    if (!scrollRegion) return null;
    return {
      distanceFromBottom:
        scrollRegion.scrollHeight - scrollRegion.scrollTop - scrollRegion.clientHeight,
    };
  });
  expect(afterJump?.distanceFromBottom).toBeLessThan(12);
});
