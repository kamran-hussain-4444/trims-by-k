import { NextResponse } from "next/server";
import { BOOKING_RULES } from "@/lib/config";
import { BookingError, getSlotsForRange } from "@/lib/bookings";
import { quoteTravel } from "@/lib/distance";
import { todayInLondon } from "@/lib/slots";

// GET /api/availability?service=skin-fade&mode=travel&postcode=CO1%201AA
// Returns the travel quote (if any) and free slots for the next 4 weeks.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const serviceId = url.searchParams.get("service") ?? "";
  const mode = url.searchParams.get("mode") === "travel" ? "travel" : "studio";
  const postcode = url.searchParams.get("postcode") ?? "";

  try {
    let travelMin = 0;
    let quote = null;
    if (mode === "travel") {
      quote = await quoteTravel(postcode);
      if (!quote.ok) return NextResponse.json({ quote, days: [] });
      travelMin = quote.band.travelMin;
    }

    const range = await getSlotsForRange({
      fromDate: todayInLondon(new Date()),
      days: BOOKING_RULES.maxDaysAhead + 1,
      serviceId,
      travelMin,
    });
    const days = Object.entries(range).map(([date, slots]) => ({
      date,
      slots: slots.map((s) => s.toISOString()),
    }));
    return NextResponse.json({ quote, days });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong, please try again." }, { status: 500 });
  }
}
