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

// Called when Stripe sends the client back. Trusts nothing in the URL: asks Stripe directly
// whether this session is paid and belongs to this booking.
export async function confirmPayment(bookingId: string, sessionId: string): Promise<boolean> {
  const session = await client().checkout.sessions.retrieve(sessionId);
  if (session.metadata?.booking_id !== bookingId || session.payment_status !== "paid") return false;
  const { error } = await db()
    .from("bookings")
    .update({ paid_at: new Date().toISOString(), stripe_session_id: session.id })
    .eq("id", bookingId)
    .is("paid_at", null);
  if (error) throw error;
  return true;
}
