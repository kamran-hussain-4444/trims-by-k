// End-to-end test of the live booking site: real API, real database, real admin actions.
// Run: node --env-file=.env.local tests/live-site.test.mjs [baseUrl]
// Creates TEST bookings (client emails go to Resend's test inbox, K gets the "New request"
// emails) and deletes everything it created at the end.
import { createHmac } from "node:crypto";

const BASE = process.argv[2] ?? "https://trimsbyk.co.uk";
const RUN = Date.now().toString(36);
const env = (k) => {
  const v = process.env[k]?.trim();
  if (!v) throw new Error(`${k} missing from env`);
  return v;
};

let passed = 0;
const failures = [];
function check(name, ok, detail = "") {
  if (ok) passed++;
  else failures.push(`${name} ${detail}`);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `  -> ${detail}`}`);
}

const sb = (path, init = {}) =>
  fetch(`${env("SUPABASE_URL")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env("SUPABASE_SERVICE_ROLE_KEY"),
      Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
const getBooking = async (id) => (await (await sb(`bookings?id=eq.${id}&select=*`)).json())[0];

async function availability(service, mode = "studio", postcode = "") {
  const q = new URLSearchParams({ service, mode, postcode });
  const res = await fetch(`${BASE}/api/availability?${q}`);
  return { status: res.status, ...(await res.json()) };
}
const allSlots = (days) => days.flatMap((d) => d.slots);

let n = 0;
async function book(overrides = {}) {
  n++;
  const body = {
    serviceId: "skin-fade",
    mode: "studio",
    name: `TEST ${RUN} #${n}`,
    email: `delivered+tbk-${RUN}-${n}@resend.dev`,
    phone: "07700 900123",
    haircutNotes: "automated test, please ignore",
    ...overrides,
  };
  const res = await fetch(`${BASE}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, ...(await res.json().catch(() => ({}))) };
}

// Distance bands are measured from K's (private) base postcode, so pick test postcodes by measuring.
async function latlng(pc) {
  const r = await (await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`)).json();
  return r.result ? { lat: r.result.latitude, lng: r.result.longitude } : null;
}
function miles(a, b) {
  const R = 3958.8, toRad = (d) => (d * Math.PI) / 180;
  const h = Math.sin(toRad(b.lat - a.lat) / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
async function postcodesByBand() {
  const base = await latlng(env("BASE_POSTCODE"));
  const candidates = ["CO1 1AA", "CO2 7AA", "CO3 3AA", "CO4 3SQ", "CO4 5AA", "CO5 0AA", "CO6 1AA", "CO7 7AA", "CO7 0AA", "CO11 1AA", "CO15 1AA", "CO10 2AA", "CM1 1HT", "IP1 1AA", "CM7 1AA"];
  const bands = {};
  for (const pc of candidates) {
    const p = await latlng(pc);
    if (!p) continue;
    const d = miles(base, p);
    const band = d <= 5 ? "b5" : d <= 10 ? "b10" : d <= 50 ? "b50" : null;
    if (band && !bands[band]) bands[band] = pc;
  }
  return bands;
}

// Admin: sign a session cookie the same way the app does, then submit the real admin forms.
function adminCookie() {
  const expires = String(Date.now() + 10 * 60 * 1000);
  const sig = createHmac("sha256", env("ADMIN_SECRET")).update(expires).digest("hex");
  return `tbk_admin=${expires}.${sig}`;
}
async function adminSetStatus(id, status) {
  const page = await fetch(`${BASE}/admin/bookings/${id}`, { headers: { cookie: adminCookie() } });
  const html = await page.text();
  // Each status button is its own <form> holding hidden id/status inputs plus Next's action id.
  const forms = html.split("<form").slice(1);
  const form = forms.find((f) => f.includes(`value="${status}"`));
  if (!form) return { ok: false, reason: `no ${status} button on page (HTTP ${page.status})` };
  const fd = new FormData();
  for (const m of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const name = m[0].match(/name="([^"]*)"/)?.[1];
    const value = m[0].match(/value="([^"]*)"/)?.[1] ?? "";
    if (name) fd.append(name, value);
  }
  const res = await fetch(`${BASE}/admin/bookings/${id}`, { method: "POST", body: fd, headers: { cookie: adminCookie() }, redirect: "manual" });
  return { ok: res.status < 400, reason: `HTTP ${res.status}` };
}

const created = [];
const track = (r) => {
  if (r.id) created.push(r.id);
  return r;
};

try {
  console.log(`Testing ${BASE} (run ${RUN})\n`);

  // ---------- Availability ----------
  const studio = await availability("skin-fade");
  const studioSlots = allSlots(studio.days);
  check("availability: studio slots returned", studio.status === 200 && studioSlots.length > 0, `${studio.status}, ${studioSlots.length} slots`);
  check("availability: 29 days returned (today + 4 weeks)", studio.days.length === 29, String(studio.days.length));
  const weekdayOf = (d) => new Date(`${d}T12:00:00Z`).getUTCDay();
  const closedWeekday = studio.days.find((d) => [1, 2, 3].includes(weekdayOf(d.date)));
  check("availability: Mon-Wed have no slots", studio.days.filter((d) => [1, 2, 3].includes(weekdayOf(d.date))).every((d) => d.slots.length === 0));
  check("availability: unknown service rejected", (await availability("perm")).status === 400);

  const bands = await postcodesByBand();
  check("setup: found a test postcode in each travel band", bands.b5 && bands.b10 && bands.b50, JSON.stringify(Object.keys(bands)));

  const far = await availability("skin-fade", "travel", "M1 1AE");
  check("travel >50mi: quoted as too far, no slots", far.quote?.ok === false && far.quote.reason === "too_far" && allSlots(far.days).length === 0, JSON.stringify(far.quote));
  const bad = await availability("skin-fade", "travel", "ZZ99 9ZZ");
  check("travel invalid postcode: rejected", bad.quote?.ok === false && bad.quote.reason === "invalid_postcode");

  const expected = { b5: [1500, 30], b10: [3000, 45], b50: [6500, 75] };
  for (const [band, [fee, mins]] of Object.entries(expected)) {
    if (!bands[band]) continue;
    const a = await availability("skin-fade", "travel", bands[band]);
    check(`travel ${band}: fee ${fee / 100} and ${mins} min drive`, a.quote?.ok && a.quote.band.feePence === fee && a.quote.band.travelMin === mins, JSON.stringify(a.quote?.band));
  }

  // ---------- Invalid requests (must not create bookings) ----------
  const slot = studioSlots[0];
  check("reject: bad email", (await book({ start: slot, email: "not-an-email" })).status === 400);
  check("reject: short phone", (await book({ start: slot, phone: "123" })).status === 400);
  check("reject: letters as phone number", (await book({ start: slot, phone: "abcdefghij" })).status === 400);
  check("reject: fake repeated-digit number", (await book({ start: slot, phone: "07000000000" })).status === 400);
  const typo = await book({ start: slot, email: "ryan.test@gmail.con" });
  check("reject: email domain typo (gmail.con) with suggestion", typo.status === 409 && /gmail.com/.test(typo.error ?? ""), JSON.stringify(typo));
  check("reject: 1-letter name", (await book({ start: slot, name: "A" })).status === 400);
  check("reject: unknown service", (await book({ start: slot, serviceId: "perm" })).status === 409);
  check("reject: home visit without address", (await book({ start: slot, mode: "travel", postcode: bands.b5 })).status === 400);
  const farBook = await book({ start: slot, mode: "travel", postcode: "M1 1AE", address: "1 Test St" });
  check("reject: home visit over 50 miles", farBook.status === 409 && /50 miles/.test(farBook.error), farBook.error);
  check("reject: invalid postcode", (await book({ start: slot, mode: "travel", postcode: "ZZ99 9ZZ", address: "1 Test St" })).status === 409);
  check("reject: time in the past", (await book({ start: new Date(Date.now() - 86400000).toISOString() })).status === 409);
  check("reject: 40 days ahead", (await book({ start: new Date(Date.now() + 40 * 86400000).toISOString() })).status === 409);
  check("reject: off-grid time (xx:07)", (await book({ start: new Date(new Date(slot).getTime() + 7 * 60000).toISOString() })).status === 409);
  if (closedWeekday) {
    check("reject: day K doesn't work (Mon-Wed)", (await book({ start: `${closedWeekday.date}T18:00:00.000Z` })).status === 409);
  }
  const malformed = await fetch(`${BASE}/api/bookings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{not json" });
  check("reject: malformed JSON", malformed.status === 400);
  const { length: leaked } = await (await sb(`clients?name=like.TEST%20${RUN}*&select=id`)).json();
  check("reject: no bookings created by rejected requests", leaked === 0, `${leaked} clients created`);

  // ---------- Successful bookings ----------
  const s1 = track(await book({ start: slot, totalPence: 1, travel_fee_pence: 0 })); // price tampering attempt
  check("book: studio skin fade", s1.status === 200 && s1.id, JSON.stringify(s1));
  const b1 = await getBooking(s1.id);
  check("book: price recalculated server-side (tampering ignored)", b1?.total_pence === 2500 && b1.travel_fee_pence === 0, `${b1?.total_pence}`);
  check("book: studio block = cut length only", new Date(b1.block_end) - new Date(b1.block_start) === 45 * 60000);
  check("book: status starts as pending", b1.status === "pending");

  const dup = await book({ start: slot });
  check("conflict: same slot twice refused", dup.status === 409, JSON.stringify(dup));
  check("conflict: booked slot no longer offered", !allSlots((await availability("skin-fade")).days).includes(slot));

  const travelIds = {};
  for (const [band, [fee, mins]] of Object.entries(expected)) {
    if (!bands[band]) continue;
    const a = await availability("skin-fade-beard", "travel", bands[band]);
    // Use a later day for each band so bookings don't collide with each other.
    const day = a.days.filter((d) => d.slots.length).at(-1 - Object.keys(travelIds).length);
    const start = day.slots[Math.floor(day.slots.length / 2)];
    const r = track(await book({ serviceId: "skin-fade-beard", mode: "travel", postcode: bands[band], address: "1 Test Street", start }));
    travelIds[band] = r.id;
    const b = r.id && (await getBooking(r.id));
    check(`book: home visit ${band} (${bands[band]})`, r.status === 200 && b?.total_pence === 3000 + fee, `${r.status} ${b?.total_pence}`);
    if (b) {
      const blocked = (new Date(b.block_end) - new Date(b.block_start)) / 60000;
      check(`book: ${band} diary blocks cut + ${mins} min each way`, blocked === 60 + 2 * mins, `${blocked} min`);
    }
  }

  // A studio cut can't be squeezed into the driving time around a home visit.
  if (travelIds.b50) {
    const t = await getBooking(travelIds.b50);
    const insideDrive = new Date(new Date(t.start_at).getTime() - 60 * 60000).toISOString();
    const offered = allSlots((await availability("skin-fade")).days);
    check("conflict: no slot offered during home-visit driving time", !offered.includes(insideDrive) && !offered.includes(t.start_at.replace("+00:00", ".000Z")));
    const sneak = await book({ start: insideDrive });
    check("conflict: booking inside driving time refused", sneak.status === 409, JSON.stringify(sneak));
  }

  // ---------- Admin ----------
  const noLogin = await fetch(`${BASE}/admin`, { redirect: "manual" });
  check("admin: logged-out visitor sent to login", noLogin.status === 307 && /\/admin\/login/.test(noLogin.headers.get("location") ?? ""));
  const forged = await fetch(`${BASE}/admin`, { redirect: "manual", headers: { cookie: "tbk_admin=9999999999999.forged" } });
  check("admin: forged cookie rejected", forged.status >= 300 && forged.status < 400 && /login/.test(forged.headers.get("location") ?? ""), `${forged.status}`);

  const conf = await adminSetStatus(s1.id, "confirmed");
  check("admin: confirm booking", conf.ok && (await getBooking(s1.id)).status === "confirmed", conf.reason);
  const cancel = await adminSetStatus(s1.id, "cancelled");
  check("admin: cancel confirmed booking", cancel.ok && (await getBooking(s1.id)).status === "cancelled", cancel.reason);
  check("admin: cancelled slot is bookable again", allSlots((await availability("skin-fade")).days).includes(slot));

  if (travelIds.b5) {
    const dec = await adminSetStatus(travelIds.b5, "declined");
    check("admin: decline request", dec.ok && (await getBooking(travelIds.b5)).status === "declined", dec.reason);
    const again = await adminSetStatus(travelIds.b5, "confirmed");
    check("admin: can't confirm a declined booking", (await getBooking(travelIds.b5)).status === "declined", again.reason);
  }
} catch (e) {
  failures.push(`crashed: ${e.stack ?? e}`);
  console.log("CRASH", e);
} finally {
  // ---------- Clean up ----------
  const clients = await (await sb(`clients?name=like.TEST%20${RUN}*&select=id`)).json();
  for (const c of clients) await sb(`bookings?client_id=eq.${c.id}`, { method: "DELETE" });
  for (const c of clients) await sb(`clients?id=eq.${c.id}`, { method: "DELETE" });
  const left = await (await sb(`clients?name=like.TEST%20${RUN}*&select=id`)).json();
  console.log(`\nCleaned up ${clients.length} test clients and their bookings (${left.length} left).`);
  console.log(`\n${passed} passed, ${failures.length} failed`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exitCode = failures.length ? 1 : 0;
}
