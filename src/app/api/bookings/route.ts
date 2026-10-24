import { NextResponse } from "next/server";
import { BookingError, bookingRequestSchema, createBookingRequest } from "@/lib/bookings";
import { sendNewRequestEmails } from "@/lib/email";

export async function POST(req: Request) {
  const parsed = bookingRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check your details." }, { status: 400 });
  }

  try {
    const { booking, client } = await createBookingRequest(parsed.data);
    await sendNewRequestEmails({ ...booking, client });
    return NextResponse.json({ id: booking.id });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong, please try again." }, { status: 500 });
  }
}
