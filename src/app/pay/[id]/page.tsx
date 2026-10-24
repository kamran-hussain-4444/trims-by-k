import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Lock } from "lucide-react";
import { formatPrice } from "@/lib/config";
import { getBookingWithClient } from "@/lib/bookings";
import { canPayOnline, confirmPayment } from "@/lib/payments";
import { formatDateTime } from "@/lib/slots";
import { LogoMark } from "@/components/logo";
import { startCheckout } from "./actions";

export const metadata: Metadata = { title: "Pay | Trims by K", robots: { index: false } };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { id } = await params;
  const { session_id } = await searchParams;
  if (!UUID.test(id)) notFound();
  if (session_id) await confirmPayment(id, session_id).catch((e) => console.error("confirmPayment", e));

  const b = await getBookingWithClient(id);
  if (!b) notFound();

  const when = formatDateTime(new Date(b.start_at));
  let body: React.ReactNode;
  if (b.paid_at) {
    body = (
      <>
        <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500">
          <Check className="size-7 text-black" />
        </div>
        <h1 className="mt-5 font-display text-4xl font-extrabold uppercase italic">Paid, thanks!</h1>
        <p className="mt-2 text-muted">
          {b.service_name}, {when}. Nothing to pay on the day.
        </p>
      </>
    );
  } else if (canPayOnline(b)) {
    body = (
      <>
        <h1 className="font-display text-4xl font-extrabold uppercase italic">Pay online</h1>
        <div className="mt-5 w-full rounded-2xl border border-line bg-surface p-4 text-left text-sm">
          <p className="font-semibold">{b.service_name}</p>
          <p className="text-muted">
            {when} · {b.mode === "travel" ? "Home visit" : "K's place"}
          </p>
          <p className="mt-3 flex items-end justify-between border-t border-line pt-3">
            <span className="text-muted">
              {formatPrice(b.service_price_pence)}
              {b.travel_fee_pence > 0 && ` + ${formatPrice(b.travel_fee_pence)} travel`}
            </span>
            <span className="font-display text-3xl font-bold italic">{formatPrice(b.total_pence)}</span>
          </p>
        </div>
        <form action={startCheckout} className="mt-5 w-full">
          <input type="hidden" name="id" value={b.id} />
          <button className="flex w-full items-center justify-center gap-2 rounded-full bg-red py-4 font-semibold text-white hover:bg-red-hot">
            <Lock className="size-4" /> Pay {formatPrice(b.total_pence)} securely
          </button>
        </form>
        <p className="mt-3 text-xs text-muted">Card, Apple Pay or Google Pay through Stripe. Prefer to pay on the day? That&apos;s fine too.</p>
      </>
    );
  } else {
    const reason =
      b.status === "pending"
        ? "Online payment opens once K confirms your booking. You'll get an email with the link."
        : b.status === "confirmed"
          ? "Online payment isn't available for this booking. Just pay on the day."
          : "This booking is no longer active.";
    body = (
      <>
        <h1 className="font-display text-4xl font-extrabold uppercase italic">Payment</h1>
        <p className="mt-3 text-muted">{reason}</p>
      </>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-4 py-12 text-center">
      <LogoMark withName className="mb-8 size-20 text-[30px]" />
      {body}
      <Link href="/" className="mt-8 text-sm text-muted underline underline-offset-4">
        Back to Trims by K
      </Link>
    </main>
  );
}
