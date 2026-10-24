import assert from "node:assert/strict";
import { computeSlots, formatSlotTime, occupiedInterval } from "../src/lib/slots";

const blocks = [{ weekday: 4, startTime: "17:00", endTime: "22:00" }]; // Thursday
const now = new Date("2026-10-26T09:00:00Z"); // Monday
const date = "2026-10-29"; // Thursday, after the clocks go back (GMT)

// Studio, 45 min: 17:00 ... 21:15
let s = computeSlots({ date, durationMin: 45, travelMin: 0, blocks, busy: [], closed: false, now });
assert.equal(formatSlotTime(s[0]), "17:00");
assert.equal(formatSlotTime(s.at(-1)!), "21:15");
assert.equal(s.length, 18);

// Travel 75 min each way: earliest 18:15, last must end + 75 <= 22:00 -> start <= 19:00
s = computeSlots({ date, durationMin: 45, travelMin: 75, blocks, busy: [], closed: false, now });
assert.deepEqual(s.map(formatSlotTime), ["18:15", "18:30", "18:45", "19:00", "19:15", "19:30", "19:45", "20:00"]);

// Existing travel booking at 19:00 (blocks 17:45-21:00) leaves studio slots 17:00 and 21:00+
const busy = [occupiedInterval(new Date("2026-10-29T19:00:00Z"), 45, 75)];
s = computeSlots({ date, durationMin: 45, travelMin: 0, blocks, busy, closed: false, now });
assert.deepEqual(s.map(formatSlotTime), ["17:00", "21:00", "21:15"]);

// Closed day, wrong weekday, too far ahead
assert.equal(computeSlots({ date, durationMin: 45, travelMin: 0, blocks, busy: [], closed: true, now }).length, 0);
assert.equal(computeSlots({ date: "2026-10-28", durationMin: 45, travelMin: 0, blocks, busy: [], closed: false, now }).length, 0);
assert.equal(computeSlots({ date: "2026-12-31", durationMin: 45, travelMin: 0, blocks, busy: [], closed: false, now }).length, 0);

// 3 hours notice: now 16:30 on the day -> first slot 19:30
s = computeSlots({ date, durationMin: 45, travelMin: 0, blocks, busy: [], closed: false, now: new Date("2026-10-29T16:30:00Z") });
assert.equal(formatSlotTime(s[0]), "19:30");

// BST date (before clocks change): 17:00 London = 16:00 UTC
const bst = computeSlots({ date: "2026-10-22", durationMin: 45, travelMin: 0, blocks, busy: [], closed: false, now: new Date("2026-10-20T09:00:00Z") });
assert.equal(bst[0].toISOString(), "2026-10-22T16:00:00.000Z");

console.log("all slot tests passed");
