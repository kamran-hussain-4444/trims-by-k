import { X } from "lucide-react";
import { getClosedDates } from "@/lib/bookings";
import { db } from "@/lib/db";
import { todayInLondon } from "@/lib/slots";
import { addAvailability, addClosedDate, removeAvailability, removeClosedDate } from "../../actions";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Week shown Monday first
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function AvailabilityPage() {
  const [{ data: blocks, error }, closed] = await Promise.all([
    db().from("availability_blocks").select("id, weekday, start_time, end_time").order("start_time"),
    getClosedDates(),
  ]);
  if (error) throw error;
  const today = todayInLondon(new Date());
  const upcomingClosed = closed.filter((c) => c.date >= today);

  return (
    <div className="grid gap-10">
      <section>
        <h1 className="font-display text-3xl font-extrabold uppercase italic">Weekly hours</h1>
        <p className="mt-1 text-sm text-muted">
          Clients can only book inside these times. Travel bookings also need driving time to fit inside.
        </p>

        <ul className="mt-5 grid gap-2">
          {ORDER.map((wd) => {
            const dayBlocks = blocks.filter((b) => b.weekday === wd);
            return (
              <li key={wd} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
                <span className="w-24 text-sm font-semibold">{DAYS[wd]}</span>
                <div className="flex flex-1 flex-wrap gap-2">
                  {dayBlocks.length === 0 && <span className="text-sm text-muted">Off</span>}
                  {dayBlocks.map((b) => (
                    <form key={b.id} action={removeAvailability}>
                      <input type="hidden" name="id" value={b.id} />
                      <button
                        aria-label={`Remove ${DAYS[wd]} ${b.start_time.slice(0, 5)} to ${b.end_time.slice(0, 5)}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm hover:bg-red/20"
                      >
                        {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                        <X className="size-3.5 text-muted" />
                      </button>
                    </form>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>

        <form action={addAvailability} className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-4">
          <select name="weekday" className="col-span-2 rounded-xl border border-line bg-ink px-3 py-2.5 sm:col-span-1">
            {ORDER.map((wd) => (
              <option key={wd} value={wd}>
                {DAYS[wd]}
              </option>
            ))}
          </select>
          <input name="start" type="time" required defaultValue="17:00" className="rounded-xl border border-line bg-ink px-3 py-2.5" />
          <input name="end" type="time" required defaultValue="21:00" className="rounded-xl border border-line bg-ink px-3 py-2.5" />
          <button className="col-span-2 rounded-xl bg-red py-2.5 font-semibold text-white sm:col-span-1">Add hours</button>
        </form>
      </section>

      <section>
        <h2 className="font-display text-3xl font-extrabold uppercase italic">Days off</h2>
        <p className="mt-1 text-sm text-muted">Block out a whole day, e.g. holidays.</p>
        <ul className="mt-4 grid gap-2">
          {upcomingClosed.length === 0 && <li className="text-sm text-muted">No days off booked.</li>}
          {upcomingClosed.map((c) => (
            <li key={c.date} className="flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-sm">
              <span>
                {new Date(`${c.date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                {c.note && <span className="text-muted"> · {c.note}</span>}
              </span>
              <form action={removeClosedDate}>
                <input type="hidden" name="date" value={c.date} />
                <button aria-label="Remove day off" className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
                  <X className="size-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addClosedDate} className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-[1fr_1fr_auto]">
          <input name="date" type="date" required min={today} className="rounded-xl border border-line bg-ink px-3 py-2.5" />
          <input name="note" placeholder="Note (optional)" className="rounded-xl border border-line bg-ink px-3 py-2.5" />
          <button className="col-span-2 rounded-xl bg-red px-5 py-2.5 font-semibold text-white sm:col-span-1">Add day off</button>
        </form>
      </section>
    </div>
  );
}
