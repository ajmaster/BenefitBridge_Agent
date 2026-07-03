import { expect, test } from "@playwright/test";

// Replaces the marketing-facing coverage from the retired `dashboard.spec.ts`
// (which exercised the whole app from `/` back when `/` rendered the
// `BenefitBridgeDashboard` monolith). `/` is now the marketing landing page;
// the workspace behaviors from that old spec are reattributed to
// `workspace.spec.ts` instead. See that file's header comment for the full
// coverage map.

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

test("hero renders headline and primary CTA navigates to the chat workspace", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Ask AidAtlasCA. Find help nearby.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Voice agent")).toBeVisible();
  await expect(page.getByText("Maps", { exact: true })).toBeVisible();
  await expect(page.getByText("Places handoffs")).toBeVisible();
  await expect(page.getByText("Calendar reminders", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Ask AidAtlasCA" }).first().click();
  await page.waitForURL(/\/app\/chat\/?$/);
  await continueAsGuestIfNeeded(page);
  await expect(page.getByTestId("chat-sidepanel")).toBeVisible();
});

test("demo gallery dialog opens on card click and contains a video", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Conversation Atlas Demo" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("video")).toHaveCount(1);
});

test("trust strip shows the required boundary reminders", async ({ page }) => {
  await page.goto("/");

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
  await expect(
    page.getByText("Local details can change. Call before going.").first(),
  ).toBeVisible();
});

test("supports mobile landing layout without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );

  expect(overflow).toBe(false);
  await expect(
    page.getByRole("heading", {
      name: "Ask AidAtlasCA. Find help nearby.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Ask AidAtlasCA" }).first()).toBeVisible();
});
