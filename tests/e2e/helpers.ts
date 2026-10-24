import type { Page } from "@playwright/test";

// Every client these tests create is named "PW TEST ..." and gets a Resend test inbox address,
// so real people never get emails and teardown can find and delete them.
export const TEST_NAME = "PW TEST";
export const testEmail = (tag: string) => `delivered+pw-${tag}-${Date.now()}@resend.dev`;
export const TEST_PHONE = "07700 900123"; // Ofcom's reserved-for-drama range

export function sb(path: string, init: RequestInit = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers },
  });
}

export async function countTestBookings(email: string): Promise<number> {
  const clients = await (await sb(`clients?email=eq.${encodeURIComponent(email)}&select=id`)).json();
  if (!clients.length) return 0;
  const rows = await (await sb(`bookings?client_id=eq.${clients[0].id}&select=id`)).json();
  return rows.length;
}

export async function deleteTestData() {
  const clients: { id: string }[] = await (await sb(`clients?name=like.${encodeURIComponent(TEST_NAME)}*&select=id`)).json();
  for (const c of clients) await sb(`bookings?client_id=eq.${c.id}`, { method: "DELETE" });
  for (const c of clients) await sb(`clients?id=eq.${c.id}`, { method: "DELETE" });
  return clients.length;
}

// Records console errors and uncaught exceptions so any test can assert the page stayed clean.
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource.*(404|409|400)/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

// Walks the booking form up to the details step and returns the chosen slot label.
export async function goToDetails(page: Page, opts: { service?: string; postcode?: string } = {}) {
  await page.goto("/book");
  await page.getByRole("button", { name: new RegExp(`^${opts.service ?? "Skin fade"}\\s*\\d`) }).click();
  if (opts.postcode) {
    await page.getByRole("button", { name: /Home visit/ }).click();
    await page.getByLabel("Your postcode").fill(opts.postcode);
    await page.getByRole("button", { name: "Check" }).click();
  } else {
    await page.getByRole("button", { name: /Come to me/ }).click();
  }
  const slot = page.getByRole("button", { name: /^\d\d:\d\d$/ }).first();
  await slot.waitFor();
  const label = await slot.innerText();
  await slot.click();
  await page.getByRole("heading", { name: "Your details" }).waitFor();
  return label;
}
