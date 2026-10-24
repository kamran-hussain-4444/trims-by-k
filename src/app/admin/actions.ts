"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, endSession, requireAdmin, startSession } from "@/lib/admin-auth";
import { setBookingStatus } from "@/lib/bookings";
import { db, type BookingStatus } from "@/lib/db";
import { sendStatusEmail } from "@/lib/email";

export async function login(_: unknown, formData: FormData) {
  if (!checkPassword(String(formData.get("password") ?? ""))) return { error: "Wrong password" };
  await startSession();
  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

const ALLOWED: Record<string, BookingStatus[]> = {
  confirmed: ["pending"],
  declined: ["pending"],
  cancelled: ["confirmed", "pending"],
};

export async function updateStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as BookingStatus;
  const { data: current } = await db().from("bookings").select("status").eq("id", id).single();
  if (!current || !ALLOWED[status]?.includes(current.status)) return;
  const booking = await setBookingStatus(id, status);
  await sendStatusEmail(booking);
  revalidatePath("/admin", "layout");
}

export async function saveClientNotes(formData: FormData) {
  await requireAdmin();
  const { error } = await db()
    .from("clients")
    .update({ private_notes: String(formData.get("notes") ?? "").slice(0, 2000) })
    .eq("id", String(formData.get("clientId")));
  if (error) throw error;
  revalidatePath("/admin", "layout");
}

export async function addAvailability(formData: FormData) {
  await requireAdmin();
  const start = String(formData.get("start"));
  const end = String(formData.get("end"));
  if (!start || !end || end <= start) return;
  const { error } = await db()
    .from("availability_blocks")
    .insert({ weekday: Number(formData.get("weekday")), start_time: start, end_time: end });
  if (error) throw error;
  revalidatePath("/admin/availability");
}

export async function removeAvailability(formData: FormData) {
  await requireAdmin();
  const { error } = await db().from("availability_blocks").delete().eq("id", String(formData.get("id")));
  if (error) throw error;
  revalidatePath("/admin/availability");
}

export async function addClosedDate(formData: FormData) {
  await requireAdmin();
  const date = String(formData.get("date"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const { error } = await db()
    .from("closed_dates")
    .upsert({ date, note: String(formData.get("note") ?? "") || null });
  if (error) throw error;
  revalidatePath("/admin/availability");
}

export async function removeClosedDate(formData: FormData) {
  await requireAdmin();
  const { error } = await db().from("closed_dates").delete().eq("date", String(formData.get("date")));
  if (error) throw error;
  revalidatePath("/admin/availability");
}
