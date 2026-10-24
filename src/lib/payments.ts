import "server-only";
import Stripe from "stripe";
import { BUSINESS } from "./config";
import { db, type BookingRow } from "./db";
import { formatDateTime } from "./slots";

// Optional online payment through Stripe Checkout: Stripe hosts the card form, so card
// details never touch this site. Switched off entirely while STRIPE_SECRET_KEY is unset.

export const paymentsEnabled = () => !!process.env.STRIPE_SECRET_KEY;

let stripe: Stripe | null = null;
function client(): Stripe {
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return stripe;
}

const siteUrl = () => process.env.SITE_URL ?? "http://localhost:3000";

export function canPayOnline(b: Pick<BookingRow, "status" | "paid_at" | "start_at">): boolean {
  return paymentsEnabled() && b.status === "confirmed" && !b.paid_at && new Date(b.start_at) > new Date();
}

export async function createCheckout(b: BookingRow & { client: { email: string } }): Promise<string> {
  const session = await client().checkout.sessions.create({
    mode: "payment",
    customer_email: b.client.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: b.total_pence, // from the database, never from the browser
          product_data: {
            name: `${b.service_name}${b.travel_fee_pence ? " + home visit" : ""}, ${BUSINESS.name}`,
            description: formatDateTime(new Date(b.start_at)),
          },
        },
      },
    ],
    metadata: { booking_id: b.id },
    success_url: `${siteUrl()}/pay/${b.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/pay/${b.id}`,
  });
  await db().from("bookings").update({ stripe_session_id: session.id }).eq("id", b.id);
  return session.url!;
}

async function markPaid(bookingId: string, sessionId: string) {
  const { error } = await db()
    .from("bookings")
    .update({ paid_at: new Date().toISOString(), stripe_session_id: sessionId })
    .eq("id", bookingId)
    .is("paid_at", null); // first writer wins, so the redirect and the webhook can both run safely
  if (error) throw error;
}

// Called when Stripe sends the client back. Trusts nothing in the URL: asks Stripe directly
// whether this session is paid and belongs to this booking.
export async function confirmPayment(bookingId: string, sessionId: string): Promise<boolean> {
  const session = await client().checkout.sessions.retrieve(sessionId);
  if (session.metadata?.booking_id !== bookingId || session.payment_status !== "paid") return false;
  await markPaid(bookingId, session.id);
  return true;
}

// Stripe also tells the server directly (a webhook), so a payment is recorded even if the
// client closes the tab before getting back to the site. The signature check proves the
// message really came from Stripe.
export async function handleWebhook(rawBody: string, signature: string | null): Promise<void> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) throw new Error("webhook not configured or unsigned");
  const event = client().webhooks.constructEvent(rawBody, signature, secret);
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    const bookingId = session.metadata?.booking_id;
    if (bookingId && session.payment_status === "paid") await markPaid(bookingId, session.id);
  }
}
