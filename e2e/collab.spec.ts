import { expect, test, type Browser, type Page } from "@playwright/test";

test("landing starts a room and toggles theme", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("tandem-theme", "light"));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Two people/ })).toBeVisible();
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
  await page.getByLabel("Your name").fill("Akhil");
  await page.getByRole("button", { name: "Start a room" }).click();
  await expect(page).toHaveURL(/\/room\/r/);
  await expect(page.getByTestId("connection")).toHaveAttribute("data-status", "connected");
  await expect(page.getByRole("tab", { name: "Pipeline" })).toHaveAttribute("aria-selected", "true");
});

test("demo mounts two live clients", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByTitle("Akhil's live Tandem client")).toBeVisible();
  await expect(page.getByTitle("Maya's live Tandem client")).toBeVisible();
  const akhil = page.frameLocator('iframe[title="Akhil\'s live Tandem client"]');
  const maya = page.frameLocator('iframe[title="Maya\'s live Tandem client"]');
  await expect(akhil.getByTestId("connection")).toHaveAttribute("data-status", "connected");
  await expect(maya.getByTestId("connection")).toHaveAttribute("data-status", "connected");
  await expect(akhil.getByText("Product Engineer")).toBeVisible();
  await expect(maya.getByText("Product Engineer")).toBeVisible();
});

test("two clients sync the brief, a card, and a comment", async ({ browser }) => {
  const room = `e2e${Date.now().toString(36)}`;
  const { pageA, pageB, close } = await openPair(browser, room);
  try {
    await pageA.getByRole("tab", { name: "Brief" }).click();
    await pageB.getByRole("tab", { name: "Brief" }).click();
    const editorA = pageA.getByTestId("brief-editor");
    const editorB = pageB.getByTestId("brief-editor");
    await editorA.click();
    await pageA.keyboard.type("Hello from Ava");
    await expect(editorB).toContainText("Hello from Ava");
    await editorB.click();
    await pageB.keyboard.press("End");
    await pageB.keyboard.type("!");
    await expect(editorA).toContainText("Hello from Ava!");

    await pageA.getByRole("tab", { name: "Pipeline" }).click();
    await pageB.getByRole("tab", { name: "Pipeline" }).click();
    await pageA.getByRole("button", { name: "Add role to Wishlist" }).click();
    await pageA.getByRole("textbox", { name: "Company" }).fill("Supabase");
    await pageA.getByRole("textbox", { name: "Role", exact: true }).fill("Platform Engineer");
    await pageA.getByRole("button", { name: "Add to pipeline" }).click();
    await expect(pageB.getByText("Platform Engineer")).toBeVisible();

    await pageB.getByRole("button", { name: /Supabase/ }).click();
    const dialogB = pageB.getByRole("dialog");
    await dialogB.getByLabel("Write a comment").fill("Bring the offline story.");
    await dialogB.getByRole("button", { name: "Post comment" }).click();
    await pageA.getByRole("button", { name: /Supabase/ }).click();
    await expect(pageA.getByRole("dialog").getByText("Bring the offline story.")).toBeVisible();
    await expect(pageA.locator('[aria-label="Noah, online"]')).toBeVisible();
  } finally {
    await close();
  }
});

async function openPair(browser: Browser, room: string) {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  await pageA.goto(`/room/${room}?name=Ava`);
  await pageB.goto(`/room/${room}?name=Noah`);
  await connected(pageA);
  await connected(pageB);
  return {
    pageA,
    pageB,
    close: async () => {
      await contextA.close();
      await contextB.close();
    },
  };
}

async function connected(page: Page) {
  await expect(page.getByTestId("connection")).toHaveAttribute("data-status", "connected");
}
