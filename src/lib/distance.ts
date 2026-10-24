import { travelBandFor, type TravelBand } from "./config";

// UK postcode lookup via postcodes.io (free, no key). Distance is straight-line,
// K confirms every booking so a long real drive can still be declined.

type LatLng = { lat: number; lng: number };

export function normalisePostcode(input: string): string {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return compact.length > 3 ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : compact;
}

async function lookupPostcode(postcode: string): Promise<LatLng | null> {
  const res = await fetch(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(normalisePostcode(postcode))}`,
    { next: { revalidate: 60 * 60 * 24 * 30 } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.result) return null;
  return { lat: data.result.latitude, lng: data.result.longitude };
}

function haversineMiles(a: LatLng, b: LatLng): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type TravelQuote =
  | { ok: true; postcode: string; miles: number; band: TravelBand }
  | { ok: false; postcode: string; reason: "invalid_postcode" | "too_far"; miles?: number };

export async function quoteTravel(postcode: string): Promise<TravelQuote> {
  const pc = normalisePostcode(postcode);
  const basePostcode = process.env.BASE_POSTCODE;
  if (!basePostcode) throw new Error("BASE_POSTCODE is not set");

  const [base, client] = await Promise.all([lookupPostcode(basePostcode), lookupPostcode(pc)]);
  if (!base) throw new Error("BASE_POSTCODE could not be found");
  if (!client) return { ok: false, postcode: pc, reason: "invalid_postcode" };

  const miles = Math.round(haversineMiles(base, client) * 10) / 10;
  const band = travelBandFor(miles);
  if (!band) return { ok: false, postcode: pc, reason: "too_far", miles };
  return { ok: true, postcode: pc, miles, band };
}
