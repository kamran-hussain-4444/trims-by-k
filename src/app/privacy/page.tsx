import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS, whatsappLink } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy, payments & refunds | Trims by K" };

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
        Online payments are handled by Stripe; card details are entered on Stripe&apos;s secure page and never reach
        this website.
      </p>
      <p className="mt-4">
        You can ask to see or delete your data at any time by{" "}
        <a className="text-fg underline" href={whatsappLink("Hi K, please delete my booking data.")}>
          messaging me on WhatsApp
        </a>
        .
      </p>

      <h2 id="refunds" className="mt-10 scroll-mt-6 font-display text-3xl font-extrabold uppercase italic text-fg">
        Payments, cancellations &amp; refunds
      </h2>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        <li>You can pay on the day, or online in advance once I&apos;ve confirmed your booking.</li>
        <li>
          <span className="text-fg">Cancel at least 12 hours before your appointment for a full refund</span> of anything
          you paid online. Refunds go back to the card you paid with, usually within 5 to 10 working days.
        </li>
        <li>Cancellations within 12 hours of the appointment, and no-shows, aren&apos;t refunded.</li>
        <li>If I have to cancel or move your appointment, you always get a full refund or a new time of your choice.</li>
        <li>
          To cancel or change, just{" "}
          <a className="text-fg underline" href={whatsappLink("Hi K, I need to cancel/change my booking.")}>
            message me on WhatsApp
          </a>{" "}
          or text {BUSINESS.phoneDisplay}.
        </li>
      </ul>
    </main>
  );
}
