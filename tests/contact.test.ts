import assert from "node:assert/strict";
import { normaliseUkPhone, suggestEmailFix } from "../src/lib/contact";

// Valid UK numbers in the formats people actually type
for (const [input, want] of [
  ["07123 456789", "07123456789"],
  ["07123-456-789", "07123456789"],
  ["+44 7123 456789", "07123456789"],
  ["0044 7123 456789", "07123456789"],
  ["(01206) 123456", "01206123456"],
  ["020 7946 0123", "02079460123"],
]) assert.equal(normaliseUkPhone(input), want, input);

// Rejected: letters, too short/long, non-UK, obvious fakes
for (const input of ["abcdefghij", "0712345", "071234567890", "+1 555 123 4567", "07000000000", "07777777777", "08001234567", ""])
  assert.equal(normaliseUkPhone(input), null, input);

assert.equal(suggestEmailFix("ryan@gmail.con"), "ryan@gmail.com");
assert.equal(suggestEmailFix("mum@hotmial.com"), "mum@hotmail.com");
assert.equal(suggestEmailFix("a@yahoo.co.uk"), null);
assert.equal(suggestEmailFix("k@trimsbyk.co.uk"), null);
assert.equal(suggestEmailFix("not-an-email"), null);

console.log("all contact tests passed");
