import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingFlow } from "./booking-flow";

export const metadata: Metadata = { title: "Book | Trims by K" };

export default function BookPage() {
  return (
    <Suspense>
      <BookingFlow />
    </Suspense>
  );
}
