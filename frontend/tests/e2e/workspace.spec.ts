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

async function continueAsGuestIfNeeded(page: import("@playwright/test").Page) {
  const guestButton = page.getByRole("button", { name: "Continue as Guest" });
  if (
    await guestButton
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => true)
      .catch(() => false)
  ) {
    await guestButton.click();
    await expect(guestButton).toBeHidden({ timeout: 15_000 });
  }
}

test("workspace shell renders sidebar sections, chat side panel, and boundary reminders", async ({
  page,
}) => {
  await page.goto("/app/chat/");
  await continueAsGuestIfNeeded(page);

  await expect(page.getByTestId("chat-sidepanel")).toBeVisible();
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
  await continueAsGuestIfNeeded(page);

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
  await expect(page.getByRole("button", { name: "Export packet" })).toHaveCount(0);
});

test("language selector in Prepare updates section copy and chat controls", async ({ page }) => {
  await page.goto("/app/prepare/");
  await continueAsGuestIfNeeded(page);

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
  await continueAsGuestIfNeeded(page);

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
  await continueAsGuestIfNeeded(page);

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
  await continueAsGuestIfNeeded(page);

  await expect(page.getByRole("heading", { name: "California Resource Explorer" })).toBeVisible();
  await expect(page.getByRole("link", { name: "California", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Bay Area", exact: true })).toHaveCount(0);
});

test("sources tab shows current citations and the full approved source library", async ({ page }) => {
  await page.goto("/app/sources/");
  await continueAsGuestIfNeeded(page);

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
  await continueAsGuestIfNeeded(page);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );

  expect(overflow).toBe(false);
  await expect(page.getByRole("link", { name: "Prepare", exact: true })).toBeVisible();
  await expect(page.getByTestId("chat-sidepanel")).toBeVisible();
});

test("chat history persists across section navigation", async ({ page }) => {
  await page.goto("/app/chat/");
  await continueAsGuestIfNeeded(page);
  const message = "I need help with food assistance";
  await page.getByTestId("chat-input").fill(message);
  await page.getByRole("button", { name: "Send" }).click();

  // The user's own message is appended to the transcript synchronously (it
  // does not depend on a live backend responding), so this is a reliable
  // signal that the send actually went through. The same frontend-only e2e
  // environment has no backend behind `/api/*`, so the UI should also surface
  // that as an assistant-visible unavailable state instead of appearing inert.
  await expect(page.getByTestId("chat-sidepanel")).toContainText(message);
  await expect(page.getByTestId("chat-sidepanel")).toContainText("Chat workflow unavailable");

  await page.getByRole("link", { name: "Prepare", exact: true }).click();
  await page.waitForURL(/\/app\/prepare\/?$/);

  await page.getByRole("link", { name: "Chat", exact: true }).click();
  await page.waitForURL(/\/app\/chat\/?$/);

  await expect(page.getByTestId("chat-sidepanel")).toContainText(message);
});
