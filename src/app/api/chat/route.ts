import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { chat } from "@/lib/assistant";
import { BUSINESS } from "@/lib/config";
import { db } from "@/lib/db";
import { todayInLondon } from "@/lib/slots";

const DAILY_LIMIT = 40; // messages per visitor per day
const MAX_HISTORY_BYTES = 200_000;
const MAX_USER_TURNS = 25;

function visitorId(req: Request): string {
  const ip =
    req.headers.get("x-nf-client-connection-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return createHash("sha256").update(`${ip}:${process.env.ADMIN_SECRET ?? ""}`).digest("hex").slice(0, 32);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const history = body?.messages as Anthropic.MessageParam[] | undefined;
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 1000) : "";
  if (!Array.isArray(history) || !text) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const userTurns = history.filter((m) => m.role === "user" && typeof m.content === "string").length;
  if (JSON.stringify(history).length > MAX_HISTORY_BYTES || userTurns >= MAX_USER_TURNS) {
    return NextResponse.json({
      error: `This chat's got long, start a new one or book directly. Or WhatsApp K on ${BUSINESS.phoneDisplay}.`,
    }, { status: 400 });
  }

  const { data: count, error } = await db().rpc("bump_chat_usage", {
    p_visitor: visitorId(req),
    p_day: todayInLondon(new Date()),
  });
  if (error) console.error(error);
  if (typeof count === "number" && count > DAILY_LIMIT) {
    return NextResponse.json(
      { error: `You've hit today's chat limit. You can still book directly, or WhatsApp K on ${BUSINESS.phoneDisplay}.` },
      { status: 429 },
    );
  }

  try {
    const result = await chat([...history, { role: "user", content: text }]);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "The assistant is busy, try again in a moment." }, { status: 503 });
    }
    // The short ref shows in the chat so a failure reported from a screenshot can be matched to the logs.
    const ref = e instanceof Anthropic.APIError ? `api-${e.status ?? "conn"}` : "server";
    console.error(`[chat ${ref}] history=${history.length} msgs`, e);
    return NextResponse.json(
      {
        error: `Sorry, that didn't go through. Tap send to try again, or book directly. (ref ${ref})`,
        retry: true,
      },
      { status: 500 },
    );
  }
}
