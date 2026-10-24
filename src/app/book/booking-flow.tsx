"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft, Car, Check, Home, Loader2, MessageCircle } from "lucide-react";
import { BUSINESS, formatPrice, getService, SERVICES, TIMEZONE, whatsappLink } from "@/lib/config";
import { Wordmark } from "@/components/logo";

type Mode = "studio" | "travel";
type Quote =
  | { ok: true; postcode: string; miles: number; band: { feePence: number; travelMin: number; maxMiles: number } }
  | { ok: false; postcode: string; reason: "invalid_postcode" | "too_far"; miles?: number };
type Day = { date: string; slots: string[] };

const STEPS = ["Service", "Where", "Time", "Details"] as const;

const fmtTime = (iso: string) => formatInTimeZone(new Date(iso), TIMEZONE, "HH:mm");
const fmtLong = (iso: string) => formatInTimeZone(new Date(iso), TIMEZONE, "EEEE d MMMM 'at' HH:mm");

export function BookingFlow() {
  const params = useSearchParams();
  const prefill = useMemo(
    () => ({
      service: params.get("service"),
      mode: params.get("mode") as Mode | null,
      postcode: params.get("postcode"),
      start: params.get("start"),
      source: params.get("source") === "chat" ? "chat" : "web",
    }),
    [params],
  );

  const [step, setStep] = useState(() => {
    if (prefill.service && prefill.mode && prefill.start) return 3;
    if (prefill.service && getService(prefill.service)) return 1;
    return 0;
  });
  const [serviceId, setServiceId] = useState(prefill.service && getService(prefill.service) ? prefill.service : "");
  const [mode, setMode] = useState<Mode | null>(prefill.mode === "travel" || prefill.mode === "studio" ? prefill.mode : null);
  const [postcode, setPostcode] = useState(prefill.postcode ?? "");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [days, setDays] = useState<Day[] | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(prefill.start);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", haircutNotes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const service = getService(serviceId);
  const travelFee = mode === "travel" && quote?.ok ? quote.band.feePence : 0;

  async function loadAvailability(m: Mode, pc: string) {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ service: serviceId, mode: m, postcode: pc });
      const res = await fetch(`/api/availability?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuote(data.quote);
      setDays(data.days);
      return data as { quote: Quote | null; days: Day[] };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load times, please try again.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  // Arriving from the chat assistant with everything chosen: check the slot is still free.
  useEffect(() => {
    if (step !== 3 || days || !mode || !serviceId) return;
    loadAvailability(mode, postcode).then((data) => {
      const stillFree = data?.days.some((d) => d.slots.includes(prefill.start ?? ""));
      if (!stillFree) {
        setStart(null);
        setStep(2);
        if (data) setError("That time has just gone, please pick another.");
      } else {
        setDate(formatInTimeZone(new Date(prefill.start!), TIMEZONE, "yyyy-MM-dd"));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickService(id: string) {
    setServiceId(id);
    setDays(null);
    setStart(null);
    setStep(1);
  }

  async function pickMode(m: Mode) {
    setMode(m);
    setDays(null);
    setStart(null);
    if (m === "studio") {
      const data = await loadAvailability("studio", "");
      if (data) {
        selectFirstDay(data.days);
        setStep(2);
      }
    }
  }

  async function checkPostcode(e: React.FormEvent) {
    e.preventDefault();
    const data = await loadAvailability("travel", postcode);
    if (data?.quote?.ok) {
      selectFirstDay(data.days);
      setStep(2);
    }
  }

  function selectFirstDay(list: Day[]) {
    setDate(list.find((d) => d.slots.length > 0)?.date ?? list[0]?.date ?? null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          mode,
          postcode: mode === "travel" ? postcode : undefined,
          address: mode === "travel" ? form.address : undefined,
          start,
          name: form.name,
          email: form.email,
          phone: form.phone,
          haircutNotes: form.haircutNotes,
          source: prefill.source,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong, please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done && service && start) {
    return (
      <Shell>
        <div className="flex flex-col items-center pt-10 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-red">
            <Check className="size-8 text-white" />
          </div>
          <h1 className="mt-6 font-display text-5xl font-extrabold uppercase italic">Request sent</h1>
          <p className="mt-3 max-w-sm text-muted">
            {service.name}, {fmtLong(start)}. I&apos;ll confirm by email shortly. Check your inbox (and spam, just in
            case).
          </p>
          <Link href="/" className="mt-8 rounded-full border border-line px-6 py-3 font-semibold">
            Back to home
          </Link>
        </div>
      </Shell>
    );
  }

  const selectedDay = days?.find((d) => d.date === date);

  return (
    <Shell
      onBack={step > 0 ? () => { setError(null); setStep(step - 1); } : undefined}
      progress={(step + 1) / STEPS.length}
      label={STEPS[step]}
    >
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red/40 bg-red/10 p-3 text-sm">
          {error}
        </p>
      )}

      {step === 0 && (
        <>
          <StepTitle>Pick your cut</StepTitle>
          <ul className="grid gap-3">
            {SERVICES.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => pickService(s.id)}
                  className={`flex w-full items-center justify-between gap-4 rounded-2xl border bg-surface p-5 text-left transition active:scale-[0.99] ${
                    s.id === serviceId ? "border-red" : "border-line hover:border-muted"
                  }`}
                >
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="mt-0.5 text-sm text-muted">{s.durationMin} min</p>
                  </div>
                  <span className="font-display text-3xl font-bold italic">{formatPrice(s.pricePence)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {step === 1 && (
        <>
          <StepTitle>Where?</StepTitle>
          <div className="grid gap-3">
            <ChoiceCard
              selected={mode === "studio"}
              onClick={() => pickMode("studio")}
              icon={<Home className="size-5" />}
              title="Come to me"
              body={`At my place in ${BUSINESS.baseArea}. Address sent when I confirm.`}
              badge="No extra cost"
            />
            <ChoiceCard
              selected={mode === "travel"}
              onClick={() => pickMode("travel")}
              icon={<Car className="size-5" />}
              title="Home visit"
              body="I come to you and bring the chair. Travel fee based on distance."
              badge="From +£15"
            />
          </div>

          {mode === "travel" && (
            <form onSubmit={checkPostcode} className="mt-5 rounded-2xl border border-line bg-surface p-4">
              <label htmlFor="postcode" className="text-sm font-medium">
                Your postcode
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="postcode"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                  placeholder="CO1 1AA"
                  autoComplete="postal-code"
                  required
                  className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-4 py-3 uppercase outline-none focus:border-red"
                />
                <button
                  disabled={loading || postcode.trim().length < 5}
                  className="rounded-xl bg-red px-5 font-semibold text-white disabled:opacity-40"
                >
                  {loading ? <Loader2 className="size-5 animate-spin" /> : "Check"}
                </button>
              </div>
              {quote && !quote.ok && (
                <p className="mt-3 text-sm text-muted">
                  {quote.reason === "too_far" ? (
                    <>
                      That&apos;s about {Math.round(quote.miles ?? 0)} miles, outside my usual 50-mile range.{" "}
                      <a className="text-fg underline" href={whatsappLink(`Hi K, could you travel to ${quote.postcode}?`)}>
                        Message me on WhatsApp
                      </a>{" "}
                      and we&apos;ll sort something.
                    </>
                  ) : (
                    "That postcode wasn't recognised, please double-check it."
                  )}
                </p>
              )}
            </form>
          )}
          {mode === "studio" && loading && <Spinner />}
        </>
      )}

      {step === 2 && days && (
        <>
          <StepTitle>Pick a time</StepTitle>
          {quote?.ok && (
            <p className="-mt-3 mb-4 text-sm text-muted">
              {quote.postcode} is about {quote.miles} miles away, travel fee {formatPrice(quote.band.feePence)}.
            </p>
          )}
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
            {days.map((d) => {
              const dt = new Date(`${d.date}T12:00:00Z`);
              const free = d.slots.length > 0;
              const active = d.date === date;
              return (
                <button
                  key={d.date}
                  disabled={!free}
                  onClick={() => {
                    setDate(d.date);
                    setStart(null);
                  }}
                  className={`flex w-16 shrink-0 flex-col items-center rounded-2xl border py-3 transition ${
                    active
                      ? "border-red bg-red text-white"
                      : free
                        ? "border-line bg-surface hover:border-muted"
                        : "border-transparent text-muted/40"
                  }`}
                >
                  <span className="text-xs uppercase">{formatInTimeZone(dt, "UTC", "EEE")}</span>
                  <span className="font-display text-2xl font-bold">{formatInTimeZone(dt, "UTC", "d")}</span>
                  <span className="text-[10px] uppercase">{formatInTimeZone(dt, "UTC", "MMM")}</span>
                </button>
              );
            })}
          </div>

          {days.every((d) => d.slots.length === 0) ? (
            <EmptyTimes />
          ) : selectedDay && selectedDay.slots.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {selectedDay.slots.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStart(s);
                    setStep(3);
                  }}
                  className={`rounded-xl border py-3 font-semibold transition ${
                    s === start ? "border-red bg-red text-white" : "border-line bg-surface hover:border-red"
                  }`}
                >
                  {fmtTime(s)}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted">No times left on this day, try another.</p>
          )}
        </>
      )}

      {step === 3 && service && start && mode && (
        <form onSubmit={submit}>
          <StepTitle>Your details</StepTitle>
          <div className="mb-5 rounded-2xl border border-line bg-surface p-4 text-sm">
            <Row label="Service" value={service.name} />
            <Row label="When" value={fmtLong(start)} />
            <Row label="Where" value={mode === "travel" ? `Home visit, ${postcode.toUpperCase()}` : `My place, ${BUSINESS.baseArea}`} />
            <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
              <span className="text-muted">
                {formatPrice(service.pricePence)}
                {travelFee > 0 && ` + ${formatPrice(travelFee)} travel`} · pay on the day
              </span>
              <span className="font-display text-3xl font-bold italic">{formatPrice(service.pricePence + travelFee)}</span>
            </div>
          </div>

          <div className="grid gap-3">
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} autoComplete="name" required minLength={2} />
            <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} autoComplete="email" required />
            <Field label="Mobile" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} autoComplete="tel" required minLength={10} />
            {mode === "travel" && (
              <Field
                label="Address (house number & street)"
                value={form.address}
                onChange={(v) => setForm({ ...form, address: v })}
                autoComplete="street-address"
                required
              />
            )}
            <label className="block">
              <span className="text-sm font-medium">
                Haircut notes <span className="text-muted">(optional)</span>
              </span>
              <textarea
                value={form.haircutNotes}
                onChange={(e) => setForm({ ...form, haircutNotes: e.target.value })}
                placeholder="e.g. Skin fade, #1 on top of the fade, textured on top, keep the length"
                maxLength={500}
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-red"
              />
            </label>
          </div>

          <p className="mt-4 text-xs text-muted">
            Your details are only used to manage your booking. See the <Link href="/privacy" className="underline">privacy notice</Link>.
          </p>
          <button
            disabled={submitting}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-red py-4 font-semibold text-white transition hover:bg-red-hot disabled:opacity-60"
          >
            {submitting && <Loader2 className="size-5 animate-spin" />}
            Send booking request
          </button>
        </form>
      )}

      {step === 3 && loading && <Spinner />}
    </Shell>
  );
}

function Shell({
  children,
  onBack,
  progress,
  label,
}: {
  children: React.ReactNode;
  onBack?: () => void;
  progress?: number;
  label?: string;
}) {
  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 pb-16">
      <header className="sticky top-0 z-20 -mx-4 bg-ink/90 px-4 pt-3 backdrop-blur">
        <div className="flex h-11 items-center justify-between">
          {onBack ? (
            <button onClick={onBack} aria-label="Back" className="-ml-2 rounded-full p-2 hover:bg-surface">
              <ArrowLeft className="size-5" />
            </button>
          ) : (
            <Link href="/" aria-label="Home" className="-ml-2 rounded-full p-2 hover:bg-surface">
              <ArrowLeft className="size-5" />
            </Link>
          )}
          <Link href="/">
            <Wordmark className="text-xl" />
          </Link>
          <span className="w-16 text-right text-xs text-muted">{label}</span>
        </div>
        {progress !== undefined && (
          <div className="h-1 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-red transition-all duration-300" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </header>
      <div className="pt-6">{children}</div>
    </main>
  );
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="mb-5 font-display text-4xl font-extrabold uppercase italic tracking-tight">{children}</h1>;
}

function ChoiceCard(props: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  body: string;
  badge: string;
}) {
  return (
    <button
      onClick={props.onClick}
      className={`flex w-full gap-4 rounded-2xl border bg-surface p-5 text-left transition active:scale-[0.99] ${
        props.selected ? "border-red" : "border-line hover:border-muted"
      }`}
    >
      <span className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full ${props.selected ? "bg-red text-white" : "bg-surface-2"}`}>
        {props.icon}
      </span>
      <span className="flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="font-semibold">{props.title}</span>
          <span className="text-xs text-muted">{props.badge}</span>
        </span>
        <span className="mt-1 block text-sm text-muted">{props.body}</span>
      </span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-red"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <Loader2 className="size-6 animate-spin text-muted" />
    </div>
  );
}

function EmptyTimes() {
  return (
    <div className="mt-6 rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
      I&apos;m fully booked for the next few weeks.{" "}
      <a href={whatsappLink("Hi K, are there any cancellations coming up?")} className="inline-flex items-center gap-1 text-fg underline">
        <MessageCircle className="size-4" /> WhatsApp me
      </a>{" "}
      for cancellations.
    </div>
  );
}
