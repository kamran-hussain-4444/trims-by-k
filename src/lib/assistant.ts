import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { formatInTimeZone } from "date-fns-tz";
import { z } from "zod";
import { BOOKING_RULES, BUSINESS, formatPrice, getService, SERVICES, TIMEZONE, TRAVEL_BANDS } from "./config";
import { getSlotsForRange } from "./bookings";
import { quoteTravel } from "./distance";
import { isBookableDate, todayInLondon } from "./slots";

// The booking assistant. Claude can look things up and prepare a booking,
// but only the client can send it, from the normal booking form.

const MODEL = "claude-haiku-5-5";
const MAX_TOOL_ROUNDS = 6;

export type BookingDraft = {
  serviceId: string;
  serviceName: string;
  mode: "studio" | "travel";
  postcode: string | null;
  start: string;
  totalPence: number;
};

const SYSTEM = `You are the booking assistant for ${BUSINESS.name}, a mobile barber run by K, based in ${BUSINESS.baseArea}, UK, cutting since ${BUSINESS.since}. Clients are mostly young professional men who found K on Instagram.

Your job: help the client choose a service and a time, then prepare a booking for them to send. Keep replies short (1-3 sentences), friendly and confident, like a good barber texting a client. British English. No emojis overload, one at most.

Services (id: name, price, duration):
${SERVICES.map((s) => `- ${s.id}: ${s.name}, ${formatPrice(s.pricePence)}, ${s.durationMin} min. ${s.description}`).join("\n")}

Where:
- "studio": the client comes to K's place in ${BUSINESS.baseArea}. No extra cost. The address is only sent once K confirms, never give it out.
- "travel": K goes to the client. Travel fee by straight-line distance from K: ${TRAVEL_BANDS.map((b, i) => `${i === 0 ? "up to" : `${TRAVEL_BANDS[i - 1].maxMiles}-`}${b.maxMiles} miles ${formatPrice(b.feePence)}`).join(", ")}. Over ${TRAVEL_BANDS.at(-1)!.maxMiles} miles is not bookable online, suggest WhatsApp.

Rules:
- Bookings are requests: K confirms each one by email. Payment is on the day, no deposits.
- Bookable up to ${BOOKING_RULES.maxDaysAhead} days ahead, with at least ${BOOKING_RULES.minNoticeHours} hours' notice.
- Never invent prices, distances or times. Always use the tools: check_travel for a postcode, find_slots for times.
- Recommending a service: skin fade for faded sides, add beard if they mention a beard, scissor cut for longer or textured styles without clippers, kids/OAP by age. If unsure, ask one short question.
- When the client has picked a service, where, and a specific time from find_slots, call prepare_booking. The app then shows them a button to add their name and contact details and send it. Don't ask for their name, email, phone or address in chat.
- Only offer times that find_slots returned. Say times like "Sat 2 Nov, 11:30".
- For anything else (complaints, group bookings, cancellations, questions you can't answer) point them to WhatsApp ${BUSINESS.phoneDisplay}.
- Stay on topic: only Trims by K bookings and haircut advice.`;

const tools: Anthropic.Tool[] = [
  {
    name: "check_travel",
    description: "Distance and travel fee from K's base to a UK postcode, for home visits.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { postcode: { type: "string", description: "UK postcode, e.g. CO4 3SQ" } },
      required: ["postcode"],
      additionalProperties: false,
    },
  },
  {
    name: "find_slots",
    description:
      "Free start times for a service. Searches up to 7 days from date_from. For travel, a postcode is required so driving time is accounted for.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        service_id: { type: "string", enum: SERVICES.map((s) => s.id) },
        mode: { type: "string", enum: ["studio", "travel"] },
        postcode: { type: ["string", "null"], description: "Required when mode is travel, otherwise null" },
        date_from: { type: "string", description: "YYYY-MM-DD" },
        days: { type: "integer", description: "How many days to search, 1-7" },
      },
      required: ["service_id", "mode", "postcode", "date_from", "days"],
      additionalProperties: false,
    },
  },
  {
    name: "prepare_booking",
    description:
      "Prepare a booking the client can review and send. Only call with a time returned by find_slots. The client adds their details and sends it themselves.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        service_id: { type: "string", enum: SERVICES.map((s) => s.id) },
        mode: { type: "string", enum: ["studio", "travel"] },
        postcode: { type: ["string", "null"] },
        start: { type: "string", description: "Exact ISO start time as returned by find_slots" },
      },
      required: ["service_id", "mode", "postcode", "start"],
      additionalProperties: false,
    },
  },
];

const checkTravelInput = z.object({ postcode: z.string() });
const findSlotsInput = z.object({
  service_id: z.string(),
  mode: z.enum(["studio", "travel"]),
  postcode: z.string().nullable(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.number().int(),
});
const prepareInput = z.object({
  service_id: z.string(),
  mode: z.enum(["studio", "travel"]),
  postcode: z.string().nullable(),
  start: z.iso.datetime(),
});

async function travelMinutes(mode: "studio" | "travel", postcode: string | null) {
  if (mode === "studio") return { ok: true as const, travelMin: 0, feePence: 0, postcode: null };
  if (!postcode) return { ok: false as const, error: "A postcode is needed for a home visit." };
  const q = await quoteTravel(postcode);
  if (!q.ok) {
    return {
      ok: false as const,
      error: q.reason === "too_far" ? `About ${q.miles} miles away, too far to book online.` : "Postcode not recognised.",
    };
  }
  return { ok: true as const, travelMin: q.band.travelMin, feePence: q.band.feePence, postcode: q.postcode };
}

async function runTool(name: string, input: unknown, drafts: BookingDraft[]): Promise<unknown> {
  if (name === "check_travel") {
    const { postcode } = checkTravelInput.parse(input);
    const q = await quoteTravel(postcode);
    if (!q.ok) return q.reason === "too_far" ? { error: "too_far", miles: q.miles } : { error: "invalid_postcode" };
    return { postcode: q.postcode, miles: q.miles, travel_fee: formatPrice(q.band.feePence) };
  }

  if (name === "find_slots") {
    const args = findSlotsInput.parse(input);
    if (!getService(args.service_id)) return { error: "Unknown service" };
    const travel = await travelMinutes(args.mode, args.postcode);
    if (!travel.ok) return { error: travel.error };
    const today = todayInLondon(new Date());
    const from = args.date_from < today ? today : args.date_from;
    const range = await getSlotsForRange({
      fromDate: from,
      days: Math.min(Math.max(args.days, 1), 7),
      serviceId: args.service_id,
      travelMin: travel.travelMin,
    });
    const days = Object.entries(range)
      .filter(([date]) => isBookableDate(date, new Date()))
      .map(([date, slots]) => ({
        date,
        day: formatInTimeZone(new Date(`${date}T12:00:00Z`), "UTC", "EEE d MMM"),
        times: slots.map((s) => ({ label: formatInTimeZone(s, TIMEZONE, "HH:mm"), start: s.toISOString() })),
      }));
    return { days, note: days.every((d) => d.times.length === 0) ? "No free times in this range." : undefined };
  }

  if (name === "prepare_booking") {
    const args = prepareInput.parse(input);
    const service = getService(args.service_id);
    if (!service) return { error: "Unknown service" };
    const travel = await travelMinutes(args.mode, args.postcode);
    if (!travel.ok) return { error: travel.error };
    const date = formatInTimeZone(new Date(args.start), TIMEZONE, "yyyy-MM-dd");
    const range = await getSlotsForRange({ fromDate: date, days: 1, serviceId: service.id, travelMin: travel.travelMin });
    const free = (range[date] ?? []).some((s) => s.getTime() === new Date(args.start).getTime());
    if (!free) return { error: "That time is no longer free. Use find_slots again." };
    drafts.push({
      serviceId: service.id,
      serviceName: service.name,
      mode: args.mode,
      postcode: travel.postcode,
      start: new Date(args.start).toISOString(),
      totalPence: service.pricePence + travel.feePence,
    });
    return { ok: true, shown_to_client: "A 'Review & send' button is now shown under your message." };
  }

  return { error: `Unknown tool ${name}` };
}

export async function chat(history: Anthropic.MessageParam[]): Promise<{
  messages: Anthropic.MessageParam[];
  reply: string;
  drafts: BookingDraft[];
}> {
  const client = new Anthropic();
  const messages = [...history];
  const drafts: BookingDraft[] = [];
  const today = formatInTimeZone(new Date(), TIMEZONE, "EEEE d MMMM yyyy, HH:mm");
  const replyParts: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      output_config: { effort: "low" },
      system: `${SYSTEM}\n\nRight now it is ${today} (UK time).`,
      tools,
      messages,
    });

    // Keep the full content (thinking blocks included) so the next turn replays it unchanged.
    messages.push({ role: "assistant", content: response.content });
    for (const block of response.content) if (block.type === "text") replyParts.push(block.text);

    if (response.stop_reason === "refusal") {
      return {
        messages,
        reply: `Sorry, I can't help with that one. For anything else, WhatsApp K on ${BUSINESS.phoneDisplay}.`,
        drafts,
      };
    }
    if (response.stop_reason !== "tool_use") break;

    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const results: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUses.map(async (t) => {
        try {
          return { type: "tool_result" as const, tool_use_id: t.id, content: JSON.stringify(await runTool(t.name, t.input, drafts)) };
        } catch (e) {
          console.error("Tool failed", t.name, e);
          return { type: "tool_result" as const, tool_use_id: t.id, is_error: true, content: "Tool failed, try again or suggest WhatsApp." };
        }
      }),
    );
    messages.push({ role: "user", content: results });
  }

  const reply = replyParts.join("\n\n").trim() || "Sorry, something went wrong there. Could you say that again?";
  return { messages, reply, drafts };
}
