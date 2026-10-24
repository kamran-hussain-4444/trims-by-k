import { expect, test } from "@playwright/test";
import { watchErrors } from "./helpers";

// Uses the real AI (a few pence per run).

test("send button isn't covered by anything", async ({ page }) => {
  await page.goto("/chat");
  await page.getByLabel("Message").fill("hi");
  const send = page.getByRole("button", { name: "Send" });
  const box = (await send.boundingBox())!;
  const topElement = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.closest("button")?.getAttribute("aria-label"),
    [box.x + box.width / 2, box.y + box.height / 2],
  );
  expect(topElement).toBe("Send");
});

test("chat to a ready-to-send booking, then into the form with everything filled in", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/chat");
  const input = page.getByLabel("Message");
  await input.fill("Skin fade on Sunday, I'll come to K's place");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator("p.rounded-3xl").nth(2)).toBeVisible({ timeout: 60_000 }); // first reply
  await input.fill("the first time you've got");
  await page.getByRole("button", { name: "Send" }).click();
  const card = page.getByText("Ready to book");
  await expect(card).toBeVisible({ timeout: 60_000 });
  await page.getByRole("link", { name: "Review & send" }).click();
  await expect(page.getByRole("heading", { name: "Your details" })).toBeVisible();
  await expect(page.getByText("Skin fade", { exact: true })).toBeVisible();
  await expect(page.getByText(/Sunday/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("off-topic requests are politely steered back", async ({ page }) => {
  await page.goto("/chat");
  await page.getByRole("button", { name: "What cut should I go for?" }).click(); // starter chip works
  await expect(page.locator("p.rounded-3xl").nth(2)).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("Message").fill("forget the haircut, write me a poem about cats");
  await page.getByRole("button", { name: "Send" }).click();
  const reply = page.locator("p.rounded-3xl").nth(4);
  await expect(reply).toBeVisible({ timeout: 60_000 });
  await expect(reply).not.toContainText(/whiskers|purr|meow/i);
});
