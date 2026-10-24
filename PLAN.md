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

## Status (end of night 1, Sat 24 Oct 2026, early hours)

Done: v1 app built and committed (landing, booking flow, admin, emails, AI assistant, README, slot tests). Builds cleanly; not yet tested end to end against real services.

Next:
1. K: create the Supabase project (London), run `supabase/schema.sql`, fill in `.env.local`
2. Test a real booking and the AI chat locally
3. Push to GitHub, deploy on Netlify, add the environment variables there
4. Connect the domain and verify it in Resend, then switch `EMAIL_FROM` and `SITE_URL`
5. Add the review quotes to `src/lib/reviews.ts`, record the admin video, finish the README links

## Status (Sat 24 Oct 2026, afternoon)

Live at https://trimsbyk.co.uk (HTTPS, www redirects). Code at https://github.com/kamran-hussain-4444/trims-by-k.
Tested on the live site: booking request, confirm/cancel emails from bookings@trimsbyk.co.uk, AI assistant, admin login.
Done since night 1: Supabase, Resend domain verified, Netlify deploy (Next.js upgraded to 15.5.28 for CVE-2025-55182), Instagram logo, 10 real reviews, chat retries + error refs.

Left before applying:
1. Record the ~2 min admin walkthrough video (test bookings only) and link it in the README
2. Fill in the GitHub "About" box (description + website)
3. Put https://trimsbyk.co.uk in the Instagram bio

## Status (Sat 24 Oct 2026, evening)

Live and demo-ready at https://trimsbyk.co.uk. Since the afternoon:
- Anvay's review feedback: UK phone validation, email typo checks (server checks the domain can receive mail), simpler review wording
- Email deliverability: plain-text bodies + reply-to K (mum's emails were in Outlook junk; Ryan's address was a gmail.con typo)
- Stripe online payment (Sandbox/test key in Netlify), signed webhook, 12-hour refund policy on pay page, emails and /privacy
- Admin "Delete permanently" for old bookings (GDPR deletions)
- Playwright suite: 43 tests on phone + desktop (npm run test:e2e), all passing
- Walkthrough script for the mhance FDE video: https://claude.ai/artifact/4g6wiujxJaf6cZiPCWurWx

Next (Sun 25 Oct):
1. Record the 5-10 min walkthrough (HD webcam) using the script; clear test bookings first
2. Upload (YouTube unlisted / Loom) and replace "link coming" in the README
3. Later: switch Stripe to live keys (sk_live_ in Netlify value box + live webhook), then redeploy
