import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS, whatsappLink } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy | Trims by K" };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-sm leading-relaxed text-muted">
      <Link href="/" className="text-fg">
        ← Back
      </Link>
      <h1 className="mt-6 font-display text-4xl font-extrabold uppercase italic text-fg">Privacy notice</h1>
      <p className="mt-4">
        {BUSINESS.name} collects your name, email, mobile number, haircut notes and, for home visits, your address. This
        is only used to manage your bookings and contact you about them. It is never sold or shared for marketing.
      </p>
      <p className="mt-4">
        Booking data is stored securely with Supabase (database) and emails are sent with Resend. If you use the chat
        assistant, your messages are processed by Anthropic to generate replies and are not used to train their models.
      </p>
      <p className="mt-4">
        You can ask to see or delete your data at any time by{" "}
        <a className="text-fg underline" href={whatsappLink("Hi K, please delete my booking data.")}>
          messaging me on WhatsApp
        </a>
        .
      </p>
    </main>
  );
}
