import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, MapPin, MessageCircle, Sparkles } from "lucide-react";
import { BUSINESS, formatPrice, SERVICES, TRAVEL_BANDS, whatsappLink } from "@/lib/config";
import { REVIEWS } from "@/lib/reviews";
import { LogoMark, Wordmark } from "@/components/logo";

const GALLERY = [1, 2, 3, 4, 5, 6].map((n) => `/gallery/cut-${n}.jpg`);

export default function Home() {
  return (
    <main className="pb-28 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-ink/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Wordmark />
          <Link
            href="/book"
            className="rounded-full bg-red px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-hot"
          >
            Book now
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-red/25 blur-3xl" />
        <div className="mx-auto max-w-5xl px-4 pb-10 pt-10 md:pt-20">
          <LogoMark withName className="size-28 text-[44px]" />
          <h1 className="mt-6 font-display text-6xl font-extrabold uppercase italic leading-[0.9] tracking-tight md:text-8xl">
            Sharp cuts.
            <br />
            <span className="text-red-hot">Your place</span> or mine.
          </h1>
          <p className="mt-5 max-w-md text-base text-muted">
            Mobile barber based in {BUSINESS.baseArea}. Fades, scissor cuts and beard work for 100+ regulars since{" "}
            {BUSINESS.since}.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/book"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-red px-7 py-4 font-semibold text-white transition hover:bg-red-hot"
            >
              Book your cut
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-7 py-4 font-semibold transition hover:border-muted"
            >
              <Sparkles className="size-4 text-red-hot" />
              Chat to book
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" /> {BUSINESS.baseArea} &amp; up to 50 miles
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" /> Evenings &amp; weekends
            </span>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section aria-label="Recent cuts" className="mx-auto max-w-5xl">
        <div tabIndex={0} aria-label="Gallery of recent cuts, scroll sideways" className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 outline-none focus-visible:ring-2 focus-visible:ring-red-hot md:grid md:grid-cols-3 md:overflow-visible">
          {GALLERY.map((src, i) => (
            <div
              key={src}
              className="relative aspect-square w-[72%] shrink-0 snap-center overflow-hidden rounded-2xl bg-surface md:w-auto"
            >
              <Image
                src={src}
                alt={`Haircut by Trims by K, example ${i + 1}`}
                fill
                sizes="(min-width: 768px) 33vw, 72vw"
                className="object-cover"
                priority={i < 2}
              />
            </div>
          ))}
        </div>
        <p className="mt-3 px-4 text-sm text-muted">
          More on Instagram{" "}
          <a className="text-fg underline underline-offset-4" href={`https://instagram.com/${BUSINESS.instagram}`}>
            @{BUSINESS.instagram}
          </a>
        </p>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-5xl px-4 pt-16">
        <SectionTitle kicker="Menu" title="Services & prices" />
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {SERVICES.map((s) => (
            <li key={s.id}>
              <Link
                href={`/book?service=${s.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:border-red"
              >
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {s.durationMin} min · {s.description}
                  </p>
                </div>
                <span className="font-display text-3xl font-bold italic">{formatPrice(s.pricePence)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Travel */}
      <section className="mx-auto max-w-5xl px-4 pt-16">
        <SectionTitle kicker="Mobile" title="I'll come to you" />
        <p className="mt-3 max-w-lg text-muted">
          Come to me in {BUSINESS.baseArea} at no extra cost, or I&apos;ll bring the chair to you. Travel is priced on
          distance:
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {TRAVEL_BANDS.map((b, i) => (
            <div key={b.maxMiles} className="rounded-2xl border border-line bg-surface p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-muted">
                {i === 0 ? "Up to " : `${TRAVEL_BANDS[i - 1].maxMiles}–`}
                {b.maxMiles} mi
              </p>
              <p className="mt-1 font-display text-3xl font-bold italic">+{formatPrice(b.feePence)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 pt-16">
        <SectionTitle kicker="Easy" title="How booking works" />
        <ol className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            ["Pick your cut", "Choose a service and whether you're coming to me or I'm coming to you."],
            ["Grab a time", "See my real free slots and pick the one that suits you."],
            ["I confirm", "You'll get an email once I've locked it in. Pay on the day."],
          ].map(([title, body], i) => (
            <li key={title} className="rounded-2xl border border-line bg-surface p-5">
              <span className="font-display text-4xl font-extrabold italic text-red-hot">0{i + 1}</span>
              <p className="mt-2 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {REVIEWS.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pt-16">
          <SectionTitle kicker="Word of mouth" title="What clients say" />
          <div tabIndex={0} aria-label="Client reviews, scroll sideways" className="no-scrollbar -mx-4 mt-6 flex snap-x gap-3 overflow-x-auto px-4 outline-none focus-visible:ring-2 focus-visible:ring-red-hot">
            {REVIEWS.map((r) => (
              <figure
                key={r.name + r.quote}
                className="w-[80%] shrink-0 snap-center rounded-2xl border border-line bg-surface p-5 md:w-80"
              >
                <p className="tracking-widest" aria-label={`${r.rating} out of 5 stars`}>
                  <span className="text-red-hot">{"★".repeat(r.rating)}</span>
                  <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                </p>
                <blockquote className="mt-2 text-sm leading-relaxed">“{r.quote}”</blockquote>
                <figcaption className="mt-3 text-sm text-muted">{r.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className="mx-auto max-w-5xl px-4 pt-16">
        <div className="relative overflow-hidden rounded-3xl bg-red p-8 text-white">
          <div className="stripe absolute inset-y-0 right-0 w-24 opacity-30" />
          <p className="font-display text-4xl font-extrabold uppercase italic leading-none">Due a fresh one?</p>
          <p className="mt-2 font-medium text-white">Takes under a minute to book.</p>
          <Link
            href="/book"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 font-semibold transition hover:bg-black/80"
          >
            Book now <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-4 py-12 text-sm text-muted">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Wordmark />
          <a href={`https://instagram.com/${BUSINESS.instagram}`}>Instagram</a>
          <a href={`https://www.tiktok.com/@${BUSINESS.tiktok}`}>TikTok</a>
          <a href={whatsappLink()} className="inline-flex items-center gap-1">
            <MessageCircle className="size-4" /> WhatsApp
          </a>
          <Link href="/privacy">Privacy &amp; refunds</Link>
        </div>
        <p className="mt-4">
          © {new Date().getFullYear()} {BUSINESS.name}
        </p>
      </footer>

      {/* Thumb-reach booking bar on phones */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/90 p-3 backdrop-blur md:hidden">
        <div className="flex gap-2">
          <Link href="/book" className="flex-1 rounded-full bg-red py-3.5 text-center font-semibold text-white">
            Book now
          </Link>
          <Link
            href="/chat"
            aria-label="Chat to book"
            className="flex items-center justify-center rounded-full border border-line bg-surface px-5"
          >
            <Sparkles className="size-5 text-red-hot" />
          </Link>
        </div>
      </div>
    </main>
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-hot">
        <span className="stripe inline-block h-2 w-6" />
        {kicker}
      </p>
      <h2 className="mt-2 font-display text-4xl font-extrabold uppercase italic tracking-tight">{title}</h2>
    </div>
  );
}
