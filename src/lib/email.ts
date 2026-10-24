import "server-only";
import { formatInTimeZone } from "date-fns-tz";
import { Resend } from "resend";
import { BUSINESS, formatPrice, TIMEZONE, whatsappLink } from "./config";
import type { BookingRow, ClientRow } from "./db";
import { paymentsEnabled } from "./payments";
import { formatDateTime } from "./slots";

type Booking = BookingRow & { client: ClientRow };

const siteUrl = () => process.env.SITE_URL ?? "http://localhost:3000";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0b0b0c;font-family:Helvetica,Arial,sans-serif;color:#f4f4f5">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="width:52px;height:52px;border-radius:50%;background:#e10600;color:#000;font-weight:900;font-size:19px;letter-spacing:-1.5px;text-align:center;vertical-align:middle">TBK</td>
    <td style="padding-left:12px;font-weight:700;font-size:16px;color:#fff">Trims by K</td>
  </tr></table>
  <h1 style="font-size:22px;margin:24px 0 16px">${title}</h1>
  ${body}
  <p style="color:#a1a1aa;font-size:13px;margin-top:32px">Need to cancel or change? <a style="color:#ff3b30" href="${whatsappLink()}">WhatsApp me</a> or text ${BUSINESS.phoneDisplay}.</p>
  <p style="color:#52525b;font-size:12px">${BUSINESS.name} · @${BUSINESS.instagram}</p>
</div></body></html>`;
}

function button(href: string, label: string, style: "primary" | "secondary" = "primary"): string {
  const colours = style === "primary" ? "background:#e10600;color:#fff" : "background:#fff;color:#0b0b0c";
  return `<a href="${href}" style="display:inline-block;${colours};text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px;margin:8px 0">${label}</a>`;
}

function summary(b: Booking): string {
  const where =
    b.mode === "travel"
      ? `Home visit: ${esc(b.address ?? "")}, ${esc(b.postcode ?? "")} (${b.distance_miles} miles)`
      : `At my place in ${BUSINESS.baseArea}`;
  const rows = [
    ["When", formatDateTime(new Date(b.start_at))],
    ["Service", esc(b.service_name)],
    ["Where", where],
    ["Price", `${formatPrice(b.service_price_pence)}${b.travel_fee_pence ? ` + ${formatPrice(b.travel_fee_pence)} travel` : ""} = <b>${formatPrice(b.total_pence)}</b>, pay on the day`],
  ];
  return `<table style="width:100%;border-collapse:collapse;background:#18181b;border-radius:12px">${rows
    .map(([k, v]) => `<tr><td style="padding:10px 14px;color:#a1a1aa;font-size:13px;width:80px;vertical-align:top">${k}</td><td style="padding:10px 14px;font-size:14px">${v}</td></tr>`)
    .join("")}</table>`;
}

function calendarLink(b: Booking): string {
  const fmt = (iso: string) => formatInTimeZone(new Date(iso), "UTC", "yyyyMMdd'T'HHmmss'Z'");
  const location = b.mode === "travel" ? `${b.address}, ${b.postcode}` : (process.env.BASE_ADDRESS ?? BUSINESS.baseArea);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${b.service_name} with ${BUSINESS.name}`,
    dates: `${fmt(b.start_at)}/${fmt(b.end_at)}`,
    location,
    ctz: TIMEZONE,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function htmlToText(html: string): string {
  return html
    .replace(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, "$2: $1")
    .replace(/<\/(p|h1|tr|div|table)>/g, "\n")
    .replace(/<\/td>/g, "  ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

async function send(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email skipped, no RESEND_API_KEY] ${subject} -> ${to}`);
    return;
  }
  // A failed email must never lose a booking, so errors are logged, not thrown.
  try {
    // A plain-text copy and a real reply-to address both help with spam filters (Outlook especially),
    // and replies go straight to K instead of a no-reply mailbox.
    const { error } = await new Resend(key).emails.send({
      from: process.env.EMAIL_FROM ?? `${BUSINESS.name} <onboarding@resend.dev>`,
      to,
      subject,
      html,
      text: htmlToText(html),
      replyTo: process.env.ADMIN_EMAIL,
    });
    if (error) console.error("Email failed", subject, error);
  } catch (e) {
    console.error("Email failed", subject, e);
  }
}

export async function sendNewRequestEmails(b: Booking) {
  const admin = process.env.ADMIN_EMAIL;
  const notes = b.haircut_notes ? `<p style="color:#d4d4d8">Notes: “${esc(b.haircut_notes)}”</p>` : "";
  await Promise.all([
    admin &&
      send(
        admin,
        `New request: ${b.client.name}, ${formatDateTime(new Date(b.start_at))}`,
        layout(
          `New booking request from ${esc(b.client.name)}`,
          `${summary(b)}${notes}<p style="color:#d4d4d8">${esc(b.client.phone)} · ${esc(b.client.email)}</p>${button(`${siteUrl()}/admin/bookings/${b.id}`, "Review &amp; confirm")}`,
        ),
      ),
    send(
      b.client.email,
      "Request received, Trims by K",
      layout(
        `Thanks ${esc(b.client.name.split(" ")[0])}, request received`,
        `<p style="color:#d4d4d8">I'll confirm your booking shortly. You'll get another email once it's locked in.</p>${summary(b)}`,
      ),
    ),
  ]);
}

export async function sendStatusEmail(b: Booking) {
  const first = esc(b.client.name.split(" ")[0]);
  if (b.status === "confirmed") {
    const address =
      b.mode === "studio" && process.env.BASE_ADDRESS
        ? `<p style="color:#d4d4d8">Address: <b>${esc(process.env.BASE_ADDRESS)}</b></p>`
        : `<p style="color:#d4d4d8">I'll come to you, see you there.</p>`;
    await send(
      b.client.email,
      `Confirmed: ${formatDateTime(new Date(b.start_at))}, Trims by K`,
      layout(
        `You're booked in, ${first}`,
        `${summary(b)}${address}${button(calendarLink(b), "Add to calendar")}${
          paymentsEnabled()
            ? `<p style="color:#d4d4d8;margin-top:20px">Want it sorted before the day? You can pay online now (optional):</p>${button(`${siteUrl()}/pay/${b.id}`, "Pay online now", "secondary")}`
            : ""
        }`,
      ),
    );
  } else if (b.status === "declined") {
    await send(
      b.client.email,
      "Booking request update, Trims by K",
      layout(
        `Sorry ${first}, I can't make that one`,
        `<p style="color:#d4d4d8">That slot doesn't work for me, please pick another time.</p>${button(`${siteUrl()}/book`, "Pick another time")}`,
      ),
    );
  } else if (b.status === "cancelled") {
    await send(
      b.client.email,
      "Booking cancelled, Trims by K",
      layout(
        `Your booking has been cancelled`,
        `${summary(b)}${button(`${siteUrl()}/book`, "Book a new time")}`,
      ),
    );
  }
}
