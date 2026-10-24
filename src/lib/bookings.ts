import "server-only";
import { addDays, addMinutes } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";
import { getService, TIMEZONE } from "./config";
import { db, type BookingRow, type BookingStatus, type ClientRow } from "./db";
import { normaliseUkPhone, suggestEmailFix } from "./contact";
import { quoteTravel } from "./distance";
import { emailDomainAcceptsMail } from "./email-domain";
import { computeSlots, occupiedInterval, type AvailabilityBlock, type Interval } from "./slots";

export class BookingError extends Error {}

export async function getAvailabilityBlocks(): Promise<AvailabilityBlock[]> {
  const { data, error } = await db().from("availability_blocks").select("weekday, start_time, end_time");
  if (error) throw error;
  return data.map((r) => ({
    weekday: r.weekday,
    startTime: String(r.start_time).slice(0, 5),
    endTime: String(r.end_time).slice(0, 5),
  }));
}

async function getBusyIntervals(fromDate: string, toDate: string): Promise<Interval[]> {
  // Look a day either side so long travel blocks near midnight are included.
  const from = addDays(fromZonedTime(`${fromDate}T00:00:00`, TIMEZONE), -1);
  const to = addDays(fromZonedTime(`${toDate}T00:00:00`, TIMEZONE), 2);
  const { data, error } = await db()
    .from("bookings")
    .select("block_start, block_end")
    .in("status", ["pending", "confirmed"])
    .lt("block_start", to.toISOString())
    .gt("block_end", from.toISOString());
  if (error) throw error;
  return data.map((r) => ({ start: new Date(r.block_start), end: new Date(r.block_end) }));
}

export async function getClosedDates(): Promise<{ date: string; note: string | null }[]> {
  const { data, error } = await db().from("closed_dates").select("date, note").order("date");
  if (error) throw error;
  return data;
}

function dateRange(fromDate: string, days: number): string[] {
  const start = fromZonedTime(`${fromDate}T12:00:00`, TIMEZONE);
  return Array.from({ length: days }, (_, i) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(addDays(start, i)),
  );
}

// Free start times for each date in the range, keyed by "YYYY-MM-DD".
export async function getSlotsForRange(opts: {
  fromDate: string;
  days: number;
  serviceId: string;
  travelMin: number;
}): Promise<Record<string, Date[]>> {
  const service = getService(opts.serviceId);
  if (!service) throw new BookingError("Unknown service");
  const dates = dateRange(opts.fromDate, opts.days);
  const [blocks, busy, closed] = await Promise.all([
    getAvailabilityBlocks(),
    getBusyIntervals(dates[0], dates[dates.length - 1]),
    getClosedDates(),
  ]);
  const closedSet = new Set(closed.map((c) => c.date));
  const now = new Date();
  return Object.fromEntries(
    dates.map((date) => [
      date,
      computeSlots({
        date,
        durationMin: service.durationMin,
        travelMin: opts.travelMin,
        blocks,
        busy,
        closed: closedSet.has(date),
        now,
      }),
    ]),
  );
}

export async function getSlots(opts: { date: string; serviceId: string; travelMin: number }): Promise<Date[]> {
  const range = await getSlotsForRange({ fromDate: opts.date, days: 1, ...opts });
  return range[opts.date] ?? [];
}

export const bookingRequestSchema = z
  .object({
    serviceId: z.string(),
    mode: z.enum(["studio", "travel"]),
    postcode: z.string().trim().max(10).optional(),
    address: z.string().trim().max(200).optional(),
    start: z.iso.datetime(),
    name: z.string().trim().min(2).max(80),
    email: z.email("Please enter a valid email address").trim().toLowerCase(),
    phone: z
      .string()
      .trim()
      .transform((p, ctx) => {
        const phone = normaliseUkPhone(p);
        if (!phone) {
          ctx.addIssue({ code: "custom", message: "Please enter a valid UK phone number, e.g. 07123 456789" });
          return z.NEVER;
        }
        return phone;
      }),
    haircutNotes: z.string().trim().max(500).default(""),
    source: z.enum(["web", "chat"]).default("web"),
  })
  .refine((b) => b.mode === "studio" || (b.postcode && b.address), {
    message: "Postcode and address are needed for a home visit",
  });

export type BookingRequest = z.infer<typeof bookingRequestSchema>;

export async function createBookingRequest(
  input: BookingRequest,
): Promise<{ booking: BookingRow; client: ClientRow }> {
  const service = getService(input.serviceId);
  if (!service) throw new BookingError("Unknown service");
  if (!(await emailDomainAcceptsMail(input.email))) {
    const fix = suggestEmailFix(input.email);
    throw new BookingError(
      `That email address can't receive emails${fix ? `, did you mean ${fix}?` : ". Please check it for typos."}`,
    );
  }

  // Recalculate everything on the server, never trust prices from the browser.
  let travelMin = 0;
  let travelFee = 0;
  let miles: number | null = null;
  let postcode: string | null = null;
  if (input.mode === "travel") {
    const quote = await quoteTravel(input.postcode!);
    if (!quote.ok) {
      throw new BookingError(
        quote.reason === "too_far"
          ? "That postcode is over 50 miles away, message me on WhatsApp to arrange it"
          : "That postcode wasn't recognised",
      );
    }
    travelMin = quote.band.travelMin;
    travelFee = quote.band.feePence;
    miles = quote.miles;
    postcode = quote.postcode;
  }

  const start = new Date(input.start);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(start);
  const slots = await getSlots({ date, serviceId: service.id, travelMin });
  if (!slots.some((s) => s.getTime() === start.getTime())) {
    throw new BookingError("Sorry, that time has just gone. Please pick another slot.");
  }

  const { data: client, error: clientError } = await db()
    .from("clients")
    .upsert({ email: input.email, name: input.name, phone: input.phone }, { onConflict: "email" })
    .select()
    .single<ClientRow>();
  if (clientError) throw clientError;

  const block = occupiedInterval(start, service.durationMin, travelMin);
  const { data: booking, error } = await db()
    .from("bookings")
    .insert({
      client_id: client.id,
      service_id: service.id,
      service_name: service.name,
      mode: input.mode,
      postcode,
      address: input.mode === "travel" ? input.address : null,
      distance_miles: miles,
      service_price_pence: service.pricePence,
      travel_fee_pence: travelFee,
      total_pence: service.pricePence + travelFee,
      start_at: start.toISOString(),
      end_at: addMinutes(start, service.durationMin).toISOString(),
      block_start: block.start.toISOString(),
      block_end: block.end.toISOString(),
      haircut_notes: input.haircutNotes,
      source: input.source,
    })
    .select()
    .single<BookingRow>();
  if (error) {
    // 23P01 = the no_overlapping_bookings constraint caught a double booking.
    if (error.code === "23P01") throw new BookingError("Sorry, that time has just gone. Please pick another slot.");
    throw error;
  }
  return { booking, client };
}

export async function getBookingWithClient(id: string) {
  const { data, error } = await db()
    .from("bookings")
    .select("*, client:clients(*)")
    .eq("id", id)
    .maybeSingle<BookingRow & { client: ClientRow }>();
  if (error) throw error;
  return data;
}

export async function setBookingStatus(id: string, status: BookingStatus) {
  const { data, error } = await db()
    .from("bookings")
    .update({ status })
    .eq("id", id)
    .select("*, client:clients(*)")
    .single<BookingRow & { client: ClientRow }>();
  if (error) throw error;
  return data;
}
