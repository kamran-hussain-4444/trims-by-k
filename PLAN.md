# Trims by K — Booking App Plan

Live booking site for Trims by K (mobile barber, Colchester, since 2020, 100+ clients, @trims_by_k).
Also a portfolio project for a Forward Deployed Engineer application.

**Deadline:** end of Saturday 24 October 2026.

## How booking works

- Clients send a **booking request**. K confirms or declines from the admin page or from the email.
- No online payments or deposits. Clients pay on the day.
- No sign-in for clients in v1.

### Services

| Service | Price | Time |
|---|---|---|
| Skin fade | £25 | 45 min |
| Skin fade + beard | £30 | 60 min |
| Scissor cut | £25 | 45 min |
| Beard trim / line-up | £12 | 20 min |
| Kids cut (under 12) | £15 | 45 min |
| OAP cut (65+) | £15 | 45 min |

No add-ons or group bookings in v1.

### Location and travel

- Base is always Colchester. The base address is **only** sent in the confirmation email. It is never shown on the site and never committed to the repo (it lives in an environment variable).
- **Come to me:** no travel fee.
- **I come to you:** the client enters a postcode. Distance is the straight line from base, using postcodes.io (free).

| Distance | Fee | Time blocked each way |
|---|---|---|
| Up to 5 miles | £15 | 30 min |
| 5–10 miles | £30 | 45 min |
| 10–50 miles | £65 | 75 min |
| Over 50 miles | Not offered ("message me") | n/a |

### Availability rules (editable in admin)

- K sets weekly availability blocks. To start: Thursday and Friday evenings, Saturday and Sunday.
- Bookings open up to 4 weeks ahead, with at least 3 hours' notice.
- No gap between bookings. Travel bookings block driving time before and after.

### Notifications (Resend, free tier)

- **To K:** an email for each new request, with Confirm and Decline buttons.
- **To the client:** "Request received", then "Confirmed" (with address if coming to K, and an add-to-calendar link), "Declined" or "Cancelled".
- Every client email says "Need to cancel or change? WhatsApp me".
- Admin has a "Message on WhatsApp" button for each booking (a wa.me link).

## Features in v1 (tonight)

1. **Landing page:** TBK logo, gallery of cuts, prices, 4–6 real client quotes (first name only), "100+ clients since 2020", Instagram link.
2. **Booking flow (4 taps max):** service, then travel or come to me (plus postcode and fee), then date and slot, then details (name, email, phone, haircut notes).
3. **Admin (K only):** list of requests; confirm, decline or cancel; set availability; client record with booking history, haircut notes and K's private notes; WhatsApp button.
4. **AI booking assistant:** Claude Haiku 5.5 with tools:
   - list services
   - check free slots
   - quote the travel fee from a postcode
   - prepare a booking request, which the client then sends from the UI
   
   It never makes up prices or times. It has a per-visitor message limit, and the Anthropic Console has a hard monthly spend cap.
5. **README and a ~2-minute admin screen recording**, made with test bookings only, so no real client data appears.

## Deferred to v2 (after applying)

- Client sign-in by email link, saved preference profiles, photo uploads
- Self-service cancel links
- Review-request email the day after a booking, linking to a Google Business Profile
- Show the Google star rating once reviews exist there

## Stack

| Part | Choice |
|---|---|
| App | Next.js (TypeScript) |
| UI | Tailwind CSS + shadcn/ui |
| Database | Supabase (free tier), plus a keep-awake ping |
| Email | Resend |
| AI | Claude Haiku 5.5 (`claude-haiku-5-5`) via the Anthropic SDK |
| Hosting | Netlify (free tier allows commercial use) |
| Domain | Own domain, e.g. trimsbyk.co.uk |

## Design

- Near-black background, white text, logo red used sparingly (buttons, selected slots, highlights).
- Bold condensed heading font (motorsport feel) and a clean body font.
- Mobile-first, since most visitors arrive from the Instagram bio.
- Photos cropped square and tight on the hair.

## Privacy

- Client data is only visible to K. Recruiters never see real client details.
- Secrets (API keys, base address, admin password) go in environment variables, never in the GitHub repo.
- Add a short privacy notice on the booking form (UK GDPR).

## Things K needs to do

- [ ] Buy the domain (do this first: Resend needs it verified before it can email clients)
- [ ] Create accounts: GitHub, Supabase, Netlify, Resend
- [ ] Anthropic Console: about £5 credit, a monthly limit, and an API key
- [x] WhatsApp number: 07931172506 (shown publicly on the site and in emails)
- [ ] Send: logo file, gallery photos, 4–6 review quotes, base address (for the private settings only)
