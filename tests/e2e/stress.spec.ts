import { expect, test } from "@playwright/test";
import { countTestBookings, sb, TEST_NAME, TEST_PHONE, testEmail } from "./helpers";

test.describe.configure({ timeout: 180_000 });

test("20 people grab the same slot at once: exactly one wins", async ({ request }) => {
  const avail = await (await request.get("/api/availability?service=skin-fade&mode=studio")).json();
  const slots: string[] = avail.days.flatMap((d: { slots: string[] }) => d.slots);
  const start = slots[Math.floor(slots.length / 2)];
  const emails = Array.from({ length: 20 }, (_, i) => testEmail(`race${i}`));
  const results = await Promise.all(
    emails.map((email, i) =>
      request.post("/api/bookings", {
        data: { serviceId: "skin-fade", mode: "studio", start, name: `${TEST_NAME} Race ${i}`, email, phone: TEST_PHONE },
      }),
    ),
  );
  const statuses = results.map((r) => r.status());
  expect(statuses.filter((s) => s === 200)).toHaveLength(1);
  expect(statuses.filter((s) => s === 409)).toHaveLength(19);
  const total = (await Promise.all(emails.map(countTestBookings))).reduce((a, b) => a + b, 0);
  expect(total).toBe(1);
});

test("50 simultaneous availability lookups all succeed quickly", async ({ request }) => {
  const t0 = Date.now();
  const times = await Promise.all(
    Array.from({ length: 50 }, async (_, i) => {
      const s = Date.now();
      const r = await request.get(`/api/availability?service=${i % 2 ? "skin-fade" : "beard"}&mode=studio`);
      expect(r.status()).toBe(200);
      return Date.now() - s;
    }),
  );
  times.sort((a, b) => a - b);
  const p95 = times[Math.floor(times.length * 0.95)];
  console.log(`availability x50: total ${Date.now() - t0}ms, median ${times[25]}ms, p95 ${p95}ms`);
  expect(p95).toBeLessThan(15_000);
});

test("junk and hostile input never crashes the API", async ({ request }) => {
  const nasty = [
    "not json",
    "{}",
    JSON.stringify({ serviceId: "skin-fade", mode: "studio", start: "2026-13-45T99:99:00Z", name: "x", email: "x", phone: "x" }),
    JSON.stringify({ serviceId: "'; drop table bookings; --", mode: "studio", start: new Date().toISOString(), name: "Robert'); DROP TABLE clients;--", email: "a@b.co", phone: TEST_PHONE }),
    JSON.stringify({ serviceId: "skin-fade", mode: "teleport", start: new Date().toISOString(), name: "Bob", email: "a@b.co", phone: TEST_PHONE }),
    JSON.stringify({ serviceId: "skin-fade", mode: "studio", start: new Date().toISOString(), name: "<script>alert(1)</script>", email: "a@b.co", phone: TEST_PHONE, haircutNotes: "x".repeat(10_000) }),
  ];
  for (const body of nasty) {
    const r = await request.post("/api/bookings", { data: body, headers: { "Content-Type": "application/json" } });
    expect(r.status(), body.slice(0, 60)).toBeGreaterThanOrEqual(400);
    expect(r.status(), body.slice(0, 60)).toBeLessThan(500);
  }
  // Tables still there.
  expect((await sb("bookings?select=id&limit=1")).status).toBe(200);
  expect((await sb("clients?select=id&limit=1")).status).toBe(200);
});

test("payment page: bad links are a 404, unconfirmed bookings can't be paid", async ({ page, request }) => {
  expect((await page.goto("/pay/not-a-real-booking"))?.status()).toBe(404);
  expect((await page.goto("/pay/00000000-0000-4000-8000-000000000000"))?.status()).toBe(404);
  const avail = await (await request.get("/api/availability?service=beard&mode=studio")).json();
  const start = avail.days.flatMap((d: { slots: string[] }) => d.slots).at(-1);
  const email = testEmail("pay");
  const r = await request.post("/api/bookings", {
    data: { serviceId: "beard", mode: "studio", start, name: `${TEST_NAME} Pay`, email, phone: TEST_PHONE },
  });
  const { id } = await r.json();
  await page.goto(`/pay/${id}`);
  await expect(page.getByText(/opens once K confirms/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Pay/ })).toHaveCount(0);
});
