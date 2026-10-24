import { expect, test } from "@playwright/test";
import { goToDetails, sb, TEST_NAME, TEST_PHONE, testEmail } from "./helpers";

test("wrong password is refused, admin stays locked", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByPlaceholder("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Wrong password")).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("K confirms then cancels a booking from the admin page", async ({ page }) => {
  // A client books...
  await goToDetails(page);
  const email = testEmail("admin");
  await page.getByLabel("Name").fill(`${TEST_NAME} Admin`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mobile").fill(TEST_PHONE);
  await page.getByRole("button", { name: "Send booking request" }).click();
  await expect(page.getByRole("heading", { name: "Request sent" })).toBeVisible();
  const [client] = await (await sb(`clients?email=eq.${encodeURIComponent(email)}&select=id`)).json();
  const [booking] = await (await sb(`bookings?client_id=eq.${client.id}&select=id`)).json();

  // ...K logs in and handles it.
  await page.goto(`/admin/bookings/${booking.id}`);
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByPlaceholder("Password").fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: `${TEST_NAME} Admin` })).toBeVisible(); // landed back on the booking
  await expect(page.getByText("Pay on the day")).toBeVisible();

  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByText("confirmed", { exact: true })).toBeVisible();

  await page.getByRole("textbox").fill("PW test note: #1 sides");
  await page.getByRole("button", { name: "Save notes" }).click();
  await page.reload();
  await expect(page.getByRole("textbox")).toHaveValue("PW test note: #1 sides");

  await page.getByRole("button", { name: /Cancel booking/ }).click();
  await expect(page.getByText("cancelled", { exact: true })).toBeVisible();
});

test("K adds and removes a day off", async ({ page }) => {
  await page.goto("/admin/login?next=/admin/availability");
  await page.getByPlaceholder("Password").fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Weekly hours" })).toBeVisible();
  const d = new Date(Date.now() + 26 * 86400000).toISOString().slice(0, 10);
  await page.locator('input[name="date"]').fill(d);
  await page.locator('input[name="note"]').fill("PW test day off");
  await page.getByRole("button", { name: "Add day off" }).click();
  const row = page.getByRole("listitem").filter({ hasText: "PW test day off" });
  await expect(row).toBeVisible();
  // That day is no longer bookable.
  const avail = await (await page.request.get("/api/availability?service=skin-fade&mode=studio")).json();
  expect(avail.days.find((x: { date: string }) => x.date === d)?.slots ?? []).toEqual([]);
  await row.getByRole("button", { name: "Remove day off" }).click();
  await expect(row).toHaveCount(0);
});
