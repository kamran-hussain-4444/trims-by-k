import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatPrice } from "@/lib/config";
import { db, type BookingRow, type ClientRow } from "@/lib/db";
import { formatDateTime } from "@/lib/slots";
import { StatusPill } from "@/components/status-pill";

type Row = BookingRow & { client: Pick<ClientRow, "name"> };

export default async function AdminBookings() {
  const nowIso = new Date().toISOString();
  const select = "*, client:clients(name)";
  const [pending, upcoming, recent] = await Promise.all([
    db().from("bookings").select(select).eq("status", "pending").order("start_at").returns<Row[]>(),
    db().from("bookings").select(select).eq("status", "confirmed").gte("start_at", nowIso).order("start_at").returns<Row[]>(),
    db()
      .from("bookings")
      .select(select)
      .or(`status.in.(declined,cancelled),start_at.lt."${nowIso}"`)
      .order("start_at", { ascending: false })
      .limit(20)
      .returns<Row[]>(),
  ]);
  for (const r of [pending, upcoming, recent]) if (r.error) throw r.error;

  return (
    <div className="grid gap-10">
      <Section title="Needs confirming" rows={pending.data!} empty="No new requests." highlight />
      <Section title="Upcoming" rows={upcoming.data!} empty="Nothing booked in yet." />
      <Section title="Past & cancelled" rows={recent.data!} empty="Nothing here yet." />
    </div>
  );
}

function Section({ title, rows, empty, highlight }: { title: string; rows: Row[]; empty: string; highlight?: boolean }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-extrabold uppercase italic">
        {title}
        {highlight && rows.length > 0 && (
          <span className="rounded-full bg-red px-2 py-0.5 font-sans text-xs not-italic text-white">{rows.length}</span>
        )}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="grid gap-2">
          {rows.map((b) => (
            <li key={b.id}>
              <Link
                href={`/admin/bookings/${b.id}`}
                className={`flex items-center gap-3 rounded-2xl border bg-surface p-4 transition hover:border-muted ${
                  highlight ? "border-red/60" : "border-line"
                }`}
              >
                <div className="flex-1">
                  <p className="font-semibold">
                    {b.client.name} <span className="font-normal text-muted">· {b.service_name}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {formatDateTime(new Date(b.start_at))} · {b.mode === "travel" ? `Home visit ${b.postcode}` : "At mine"} ·{" "}
                    {formatPrice(b.total_pence)}
                  </p>
                </div>
                <StatusPill status={b.status} />
                <ChevronRight className="size-4 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

