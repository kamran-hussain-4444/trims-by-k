import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, Phone } from "lucide-react";
import { formatPrice, whatsappLink } from "@/lib/config";
import { getBookingWithClient } from "@/lib/bookings";
import { db, type BookingRow } from "@/lib/db";
import { formatDateTime, formatLongDate, formatSlotTime } from "@/lib/slots";
import { StatusPill } from "@/components/status-pill";
import { saveClientNotes, updateStatus } from "../../../actions";

// UK mobiles: 07... -> 447... for wa.me links
function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `44${digits.slice(1)}` : digits;
}

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const booking = await getBookingWithClient(id);
  if (!booking) notFound();
  const { client } = booking;

  const { data: history } = await db()
    .from("bookings")
    .select("id, start_at, service_name, status, haircut_notes")
    .eq("client_id", client.id)
    .neq("id", booking.id)
    .order("start_at", { ascending: false })
    .limit(10)
    .returns<Pick<BookingRow, "id" | "start_at" | "service_name" | "status" | "haircut_notes">[]>();

  const start = new Date(booking.start_at);
  const firstName = client.name.split(" ")[0];
  const waText =
    booking.status === "pending"
      ? `Hi ${firstName}, it's K from Trims by K about your booking request for ${formatDateTime(start)}.`
      : `Hi ${firstName}, it's K from Trims by K.`;

  return (
    <div className="grid gap-6">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> All bookings
      </Link>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-extrabold uppercase italic">{client.name}</h1>
            <p className="mt-1 text-muted">
              {booking.service_name} · {formatLongDate(start)}, {formatSlotTime(start)}
            </p>
          </div>
          <StatusPill status={booking.status} />
        </div>

        <dl className="mt-5 grid gap-2 text-sm">
          <Detail label="Where">
            {booking.mode === "travel"
              ? `Home visit: ${booking.address}, ${booking.postcode} (${booking.distance_miles} mi)`
              : "At mine"}
          </Detail>
          <Detail label="Price">
            {formatPrice(booking.service_price_pence)}
            {booking.travel_fee_pence > 0 && ` + ${formatPrice(booking.travel_fee_pence)} travel`} ={" "}
            <b>{formatPrice(booking.total_pence)}</b>
          </Detail>
          {booking.mode === "travel" && (
            <Detail label="Diary">
              Blocked {formatSlotTime(new Date(booking.block_start))}–{formatSlotTime(new Date(booking.block_end))} incl.
              driving
            </Detail>
          )}
          <Detail label="Payment">
            {booking.paid_at ? (
              <span className="font-semibold text-emerald-400">Paid online ✓</span>
            ) : (
              "Pay on the day"
            )}
          </Detail>
          <Detail label="Booked via">{booking.source === "chat" ? "AI assistant" : "Website"}</Detail>
          {booking.haircut_notes && <Detail label="Their notes">“{booking.haircut_notes}”</Detail>}
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={whatsappLink(waText, toWhatsAppNumber(client.phone))}
            className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-black"
          >
            <MessageCircle className="size-4" /> WhatsApp
          </a>
          <a href={`tel:${client.phone}`} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm">
            <Phone className="size-4" /> {client.phone}
          </a>
          <a href={`mailto:${client.email}`} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm">
            <Mail className="size-4" /> Email
          </a>
        </div>
      </section>

      {(booking.status === "pending" || booking.status === "confirmed") && (
        <section className="grid gap-2 sm:grid-cols-2">
          {booking.status === "pending" && (
            <>
              <StatusButton id={booking.id} status="confirmed" className="bg-red text-white">
                Confirm booking
              </StatusButton>
              <StatusButton id={booking.id} status="declined" className="border border-line">
                Decline
              </StatusButton>
            </>
          )}
          {booking.status === "confirmed" && (
            <StatusButton id={booking.id} status="cancelled" className="border border-line sm:col-span-2">
              {booking.paid_at
                ? "Cancel booking (then refund them in Stripe)"
                : "Cancel booking (client gets an email)"}
            </StatusButton>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-semibold">Private notes on {firstName}</h2>
        <p className="mt-1 text-sm text-muted">Only you can see these. E.g. guard numbers, scalp, how they like the neckline.</p>
        <form action={saveClientNotes} className="mt-3 grid gap-2">
          <input type="hidden" name="clientId" value={client.id} />
          <textarea
            name="notes"
            defaultValue={client.private_notes}
            rows={4}
            className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-sm outline-none focus:border-red"
          />
          <button className="justify-self-start rounded-full bg-surface-2 px-5 py-2.5 text-sm font-semibold hover:bg-line">
            Save notes
          </button>
        </form>
      </section>

      {history && history.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Previous bookings</h2>
          <ul className="grid gap-2">
            {history.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/admin/bookings/${h.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 text-sm hover:border-muted"
                >
                  <span>
                    {formatDateTime(new Date(h.start_at))} · {h.service_name}
                    {h.haircut_notes && <span className="block text-muted">“{h.haircut_notes}”</span>}
                  </span>
                  <StatusPill status={h.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-2">
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function StatusButton({
  id,
  status,
  className,
  children,
}: {
  id: string;
  status: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <form action={updateStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`w-full rounded-full py-3.5 font-semibold transition active:scale-[0.99] ${className}`}>
        {children}
      </button>
    </form>
  );
}
