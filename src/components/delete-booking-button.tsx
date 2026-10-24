"use client";

import { Trash2 } from "lucide-react";
import { deleteBooking } from "@/app/admin/actions";

export function DeleteBookingButton({ id, clientName }: { id: string; clientName: string }) {
  return (
    <form
      action={deleteBooking}
      onSubmit={(e) => {
        if (!confirm(`Permanently delete this booking for ${clientName}? This can't be undone.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="inline-flex items-center gap-2 rounded-full border border-red/50 px-5 py-2.5 text-sm font-semibold text-red-hot hover:bg-red/10">
        <Trash2 className="size-4" /> Delete permanently
      </button>
    </form>
  );
}
