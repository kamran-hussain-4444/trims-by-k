"use server";

import { redirect } from "next/navigation";
import { getBookingWithClient } from "@/lib/bookings";
import { canPayOnline, createCheckout } from "@/lib/payments";

export async function startCheckout(formData: FormData) {
  const id = String(formData.get("id"));
  const booking = await getBookingWithClient(id);
  if (!booking || !canPayOnline(booking)) redirect(`/pay/${id}`);
  redirect(await createCheckout(booking));
}
