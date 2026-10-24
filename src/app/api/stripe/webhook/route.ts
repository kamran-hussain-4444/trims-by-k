import { NextResponse } from "next/server";
import { handleWebhook } from "@/lib/payments";

// Stripe > Developers > Webhooks points here (event: checkout.session.completed).
export async function POST(req: Request) {
  try {
    await handleWebhook(await req.text(), req.headers.get("stripe-signature"));
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Stripe webhook rejected", e);
    return NextResponse.json({ error: "invalid webhook" }, { status: 400 });
  }
}
