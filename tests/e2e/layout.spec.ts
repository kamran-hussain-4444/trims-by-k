import { expect, test } from "@playwright/test";
import { watchErrors } from "./helpers";

const PAGES = ["/", "/book", "/chat", "/privacy", "/admin/login"];

for (const path of PAGES) {
  test(`${path} loads cleanly with no sideways scrolling`, async ({ page }) => {
    const errors = watchErrors(page);
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await page.waitForLoadState("load");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, "page is wider than the screen").toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

test("home page: gallery images all load, key sections present", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Sharp cuts/i })).toBeVisible();
  for (const section of ["Services & prices", "I'll come to you", "How booking works", "What clients say"]) {
    await expect(page.getByRole("heading", { name: section })).toBeAttached();
  }
  const imgs = page.locator('section[aria-label="Recent cuts"] img');
  await expect(imgs).toHaveCount(6);
  for (const img of await imgs.all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  }
});

test("narrowest phones (320px) still fit", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of ["/", "/book", "/chat"]) {
    await page.goto(path);
    await page.waitForLoadState("load");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(0);
  }
});

test("every service links into the booking form", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Skin fade \+ beard/ }).click();
  await expect(page).toHaveURL(/\/book\?service=skin-fade-beard/);
  await expect(page.getByRole("heading", { name: "Where?" })).toBeVisible();
});

test("unknown pages show a 404, not a crash", async ({ page }) => {
  const res = await page.goto("/definitely-not-a-page");
  expect(res?.status()).toBe(404);
});
