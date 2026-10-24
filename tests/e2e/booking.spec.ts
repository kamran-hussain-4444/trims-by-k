import { expect, test } from "@playwright/test";
import { countTestBookings, goToDetails, TEST_NAME, TEST_PHONE, testEmail, watchErrors } from "./helpers";

test("full booking at K's place, start to finish", async ({ page }) => {
  const errors = watchErrors(page);
  const slot = await goToDetails(page);
  await expect(page.getByText("£25").last()).toBeVisible();
  const email = testEmail("studio");
  await page.getByLabel("Name").fill(`${TEST_NAME} Studio`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mobile").fill(TEST_PHONE);
  await page.getByLabel(/Haircut notes/).fill("#1 on the sides, textured top");
  await page.getByRole("button", { name: "Send booking request" }).click();
  await expect(page.getByRole("heading", { name: "Request sent" })).toBeVisible();
  await expect(page.getByText(slot)).toBeVisible();
  expect(await countTestBookings(email)).toBe(1);
  expect(errors).toEqual([]);
});

test("letters instead of a phone number are blocked (Anvay's bug)", async ({ page }) => {
  await goToDetails(page);
  const email = testEmail("letters");
  await page.getByLabel("Name").fill(`${TEST_NAME} Letters`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mobile").fill("abcdefghij");
  await page.getByLabel("Name").click(); // leave the field
  await expect(page.getByText("Please enter a valid UK mobile")).toBeVisible();
  await page.getByRole("button", { name: "Send booking request" }).click();
  await expect(page.getByRole("heading", { name: "Request sent" })).toHaveCount(0);
  expect(await countTestBookings(email)).toBe(0);
});

test("email typo gets a one-tap fix, and gmail.con is refused (Ryan's bug)", async ({ page }) => {
  await goToDetails(page);
  await page.getByLabel("Name").fill(`${TEST_NAME} Typo`);
  await page.getByLabel("Email").fill("pw.ryan.test@gmail.con");
  await page.getByLabel("Mobile").fill(TEST_PHONE);
  await expect(page.getByRole("button", { name: "Did you mean pw.ryan.test@gmail.com?" })).toBeVisible();
  // Send it anyway: the server must refuse an address that can't receive mail.
  await page.getByRole("button", { name: "Send booking request" }).click();
  const alert = page.getByRole("alert").filter({ hasText: "can't receive emails" });
  await expect(alert).toContainText("did you mean pw.ryan.test@gmail.com");
  await expect(alert).toBeInViewport(); // the client actually sees it, not hidden above the fold
  // One tap fixes it.
  await page.getByRole("button", { name: "Did you mean pw.ryan.test@gmail.com?" }).click();
  await expect(page.getByLabel("Email")).toHaveValue("pw.ryan.test@gmail.com");
});

test("home visit: fee and travel shown for a CO4 postcode", async ({ page }) => {
  await goToDetails(page, { postcode: "CO4 3SQ" });
  await expect(page.getByText("+ £30 travel")).toBeVisible();
  await expect(page.getByText("£55")).toBeVisible();
  await expect(page.getByLabel(/Address/)).toBeVisible();
});

test("home visit: out of range and nonsense postcodes are handled", async ({ page }) => {
  await page.goto("/book?service=skin-fade");
  await page.getByRole("button", { name: /Home visit/ }).click();
  const pc = page.getByLabel("Your postcode");
  await pc.fill("M1 1AE");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/outside my usual 50-mile range/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Message me on WhatsApp" })).toHaveAttribute("href", /wa\.me\/447931172506/);
  await pc.fill("ZZ99 9ZZ");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("That postcode wasn't recognised")).toBeVisible();
});

test("hammering the send button only creates one booking", async ({ page }) => {
  await goToDetails(page);
  const email = testEmail("double");
  await page.getByLabel("Name").fill(`${TEST_NAME} Double`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mobile").fill(TEST_PHONE);
  const send = page.getByRole("button", { name: "Send booking request" });
  await send.click({ clickCount: 5, delay: 10 });
  await expect(page.getByRole("heading", { name: "Request sent" })).toBeVisible();
  expect(await countTestBookings(email)).toBe(1);
});

test("back button walks back through the steps without losing the service", async ({ page }) => {
  await goToDetails(page, { service: "Scissor cut" });
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("heading", { name: "Pick a time" })).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("heading", { name: "Pick your cut" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Scissor cut/ })).toHaveClass(/border-red/);
});
