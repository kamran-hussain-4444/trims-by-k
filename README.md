# Trims by K: booking app for a real mobile barber

Booking site for **Trims by K**, my mobile barbering business in Colchester (running since 2020, 100+ clients). Clients arrive from Instagram on their phones. They pick a cut, choose whether to come to me or have me travel to them, see my real free slots and send a booking request. An AI assistant can do the same thing in conversation.

- **Live:** https://trimsbyk.co.uk *(in use by real clients)*
- **Admin walkthrough (2 min video):** *link coming*

## What it does

| For clients | For me (admin) |
|---|---|
| Services and prices, gallery of real cuts | Confirm, decline or cancel requests; each sends the client an email |
| Book in 4 taps: service, where, time, details | Weekly hours and days off, editable from my phone |
| Travel fee worked out from their postcode | Private notes per client (guard numbers, neckline, etc.) and booking history |
| **AI chat assistant** that recommends a cut, finds real slots and prepares the booking | One-tap WhatsApp to any client |

## The interesting parts

**The AI books into the real system and can't make anything up.** The assistant (Claude Haiku 5.5) uses tool calls to look up travel fees and free slots, using the same code as the booking form. When the client settles on a time, it calls `prepare_booking`. That re-checks the slot is free and shows the client a "Review & send" card. The AI never submits a booking: the client sends it through the normal form, and the server re-validates everything. See [`src/lib/assistant.ts`](src/lib/assistant.ts).

**Mobile-barber scheduling.** Home visits block out driving time before and after the cut (30, 45 or 75 minutes depending on distance). So after a 40-mile job the app won't offer a slot I physically can't get to. The slot maths lives in a pure, tested module, [`src/lib/slots.ts`](src/lib/slots.ts), and handles UK daylight-saving changes.

**No double bookings, even under a race.** Every live booking stores its time range including driving. A Postgres exclusion constraint refuses any two pending or confirmed bookings whose ranges overlap, so two people pressing "send" at the same moment can't both win. See [`supabase/schema.sql`](supabase/schema.sql).

**Never trust the browser.** Prices, travel fees and slot availability are recalculated on the server for every request. The database is only reachable server-side (row-level security on, no public policies).

**Built for a real business on a zero budget.** Free tiers throughout (Netlify, Supabase, Resend), straight-line distance from the free postcodes.io instead of a paid maps API, a daily keep-alive so the free database never pauses, and a per-visitor daily cap on AI messages so a stranger can't run up the bill.

**Privacy.** My base address is never on the site or in this repo. It's an environment variable, sent only in confirmation emails. Client data is visible only behind the admin login.

## Stack

Next.js 15 (App Router, TypeScript) · Tailwind CSS · Supabase (Postgres) · Resend (email) · Anthropic API (Claude Haiku 5.5) · Netlify

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev
npm test                     # slot scheduling tests
```

Create the database by pasting [`supabase/schema.sql`](supabase/schema.sql) into the Supabase SQL editor.

## What's next (v2)

Built under a one-day deadline, so I cut these deliberately to ship something clean:

- Client sign-in by email link, with saved preference profiles and reference photos
- Self-service cancellation links
- Automatic "How was your cut?" review requests the day after an appointment
- Upgrade to Next.js 16 (clears the remaining build-time `postcss` audit warning)
