import { expect, test } from "@playwright/test";

test("renders Conversation Atlas shell with required boundaries", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Benefits prep that stays with the conversation." }),
  ).toBeVisible();
  await expect(page.getByTestId("conversation-shell")).toBeVisible();
  await expect(page.getByTestId("chat-sidepanel")).toBeVisible();
  await expect(page.getByTestId("chat-input")).toBeVisible();
  await expect(page.getByTestId("workspace-status")).toContainText("Workspace status");
  await expect(page.getByRole("button", { name: "Start the conversation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Watch demo" })).toBeVisible();
  await expect(page.getByTestId("language-select")).toHaveValue("en");

  for (const section of ["Chat", "Prepare", "Sources", "Resources", "Packet", "Bay Area"]) {
    await expect(page.getByRole("button", { name: section }).first()).toBeVisible();
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

test("prepare packet visibly transitions into packet workspace", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Prepare" }).first().click();
  await page.getByTestId("prepare-button").click();

  await expect(page.getByTestId("workspace-status")).toContainText(
    /Packet prepared|API unavailable|deterministic demo/i,
  );
  await expect(page.getByTestId("packet-panel")).toBeVisible();
  await expect(page.getByText("Prep Packet Preview").first()).toBeVisible();
});

test("language selector updates page and chat controls", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("language-select").selectOption("es");

  await expect(
    page.getByRole("heading", {
      name: "Preparacion de beneficios que acompana la conversacion.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar conversacion" })).toBeVisible();
  await expect(page.getByTestId("chat-input")).toHaveAttribute(
    "placeholder",
    "Escribe tu pregunta...",
  );
  await expect(page.getByRole("button", { name: "Preparar paquete" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Traducir paquete actual" })).toBeVisible();
});

test("resource maps degrade to safe Google Maps links without an embed key", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Resources" }).first().click();

  await expect(page.getByTestId("map-panel")).toBeVisible();
  await expect(page.getByTestId("map-fallback")).toContainText("Map preview");
  await expect(page.locator('[data-testid="map-panel"] iframe')).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Open in Google Maps/i }).first()).toBeVisible();
});

test("supports mobile Conversation Atlas layout without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );

  expect(overflow).toBe(false);
  await expect(page.getByRole("button", { name: "Prepare" }).first()).toBeVisible();
  await expect(page.getByTestId("chat-sidepanel")).toBeVisible();
});
