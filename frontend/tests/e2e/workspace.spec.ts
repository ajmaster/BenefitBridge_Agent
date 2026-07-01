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
//   "resource maps degrade to safe Google Maps links without an embed key"
//   (below), using the real testids `ResourcesSection` actually renders
//   (`bay-map-panel`/`bay-map-fallback`, per `MapEmbedPanel`'s testId
//   override in `ResourcesSection.tsx`).
// - "supports mobile Conversation Atlas layout without horizontal overflow"
//   -> "supports mobile workspace layout without horizontal overflow" below.
//
// Plus one new test (not in the old spec): chat history persisting across
// section navigation, since `BenefitBridgeProvider` now lives at the
// `(workspace)` layout level so the controller survives route changes.

test("workspace shell renders sidebar sections, chat side panel, and boundary reminders", async ({
  page,
}) => {
  await page.goto("/app/chat/");

  await expect(page.getByTestId("chat-sidepanel")).toBeVisible();
  await expect(page.getByTestId("chat-input")).toBeVisible();

  for (const section of ["Chat", "Prepare", "Sources", "Resources", "Packet", "Bay Area"]) {
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

test("prepare packet transitions into the packet workspace", async ({ page }) => {
  await page.goto("/app/prepare/");

  await page.getByTestId("prepare-button").click();
  await page.waitForURL(/\/app\/packet\/?$/);

  await expect(page.getByTestId("packet-panel")).toBeVisible();
  await expect(page.getByText("Prep Packet Preview").first()).toBeVisible();
});

test("language selector in Prepare updates section copy and chat controls", async ({ page }) => {
  await page.goto("/app/prepare/");

  await expect(page.getByTestId("chat-input")).toHaveAttribute(
    "placeholder",
    "Type your question...",
  );

  // The Prepare form's three Select fields (synthetic profile, language,
  // housing status) have no accessible name (the shadcn `Label` above each
  // one isn't wired to the trigger via `htmlFor`/`aria-labelledby`), so they
  // can't be targeted by name. Their DOM order is stable per
  // `PrepareSection.tsx` (profile, then language, then housing status), so
  // position is the reliable selector here.
  await page.getByRole("combobox").nth(1).click();
  await page.getByRole("option", { name: "Espanol" }).click();

  await expect(
    page.getByRole("heading", { name: "Construir el resumen" }),
  ).toBeVisible();
  await expect(page.getByTestId("prepare-button")).toContainText("Preparar paquete");

  await expect(page.getByTestId("chat-input")).toHaveAttribute(
    "placeholder",
    "Escribe tu pregunta...",
  );
  await expect(page.getByRole("button", { name: "Enviar" })).toBeVisible();
});

test("resource maps degrade to safe Google Maps links without an embed key", async ({ page }) => {
  await page.goto("/app/resources/");

  await expect(page.getByTestId("bay-map-panel")).toBeVisible();
  await expect(page.getByTestId("bay-map-fallback")).toContainText("Map preview");
  await expect(page.locator('[data-testid="bay-map-panel"] iframe')).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Open in Google Maps/i }).first()).toBeVisible();
});

test("supports mobile workspace layout without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/app/chat/");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );

  expect(overflow).toBe(false);
  await expect(page.getByRole("link", { name: "Prepare", exact: true })).toBeVisible();
  await expect(page.getByTestId("chat-sidepanel")).toBeVisible();
});

test("chat history persists across section navigation", async ({ page }) => {
  await page.goto("/app/chat/");
  const message = "I need help with food assistance";
  await page.getByTestId("chat-input").fill(message);
  await page.getByRole("button", { name: "Send" }).click();

  // The user's own message is appended to the transcript synchronously (it
  // does not depend on a live backend responding), so this is a reliable
  // signal that the send actually went through, without depending on an
  // `a2ui-card` template that only a live agent backend would produce (this
  // e2e run has no backend behind `/api/*`, per `playwright.config.ts`'s
  // `webServer`, which only starts the Next dev server).
  await expect(page.getByTestId("chat-sidepanel")).toContainText(message);

  await page.getByRole("link", { name: "Prepare", exact: true }).click();
  await page.waitForURL(/\/app\/prepare\/?$/);

  await page.getByRole("link", { name: "Chat", exact: true }).click();
  await page.waitForURL(/\/app\/chat\/?$/);

  await expect(page.getByTestId("chat-sidepanel")).toContainText(message);
});
