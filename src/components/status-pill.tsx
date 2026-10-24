import type { BookingRow } from "@/lib/db";

export function StatusPill({ status }: { status: BookingRow["status"] }) {
  const styles = {
    pending: "bg-red/15 text-red-hot",
    confirmed: "bg-emerald-500/15 text-emerald-400",
    declined: "bg-surface-2 text-muted",
    cancelled: "bg-surface-2 text-muted",
  }[status];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${styles}`}>{status}</span>;
}
