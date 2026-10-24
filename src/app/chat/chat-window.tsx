"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type Anthropic from "@anthropic-ai/sdk";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft, ArrowUp, CalendarCheck, Sparkles } from "lucide-react";
import { formatPrice, TIMEZONE } from "@/lib/config";
import type { BookingDraft } from "@/lib/assistant";

type Bubble = { role: "user" | "assistant"; text: string; drafts?: BookingDraft[]; error?: boolean };

const STARTERS = [
  "What cut should I go for?",
  "Skin fade this weekend?",
  "Can you come to me in Chelmsford?",
];

export function ChatWindow() {
  const [bubbles, setBubbles] = useState<Bubble[]>([
    {
      role: "assistant",
      text: "Hey! I'm K's booking assistant. Tell me what you're after and when, and I'll find you a slot.",
    },
  ]);
  // Full API conversation, sent back each turn so the assistant keeps context.
  const [history, setHistory] = useState<Anthropic.MessageParam[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bubbles, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    setBubbles((b) => [...b, { role: "user", text: trimmed }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, text: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHistory(data.messages);
      setBubbles((b) => [...b, { role: "assistant", text: data.reply, drafts: data.drafts }]);
    } catch (e) {
      setBubbles((b) => [
        ...b,
        { role: "assistant", text: e instanceof Error && e.message ? e.message : "Something went wrong, try again.", error: true },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex h-dvh max-w-lg flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4">
        <Link href="/" aria-label="Back" className="-ml-2 rounded-full p-2 hover:bg-surface">
          <ArrowLeft className="size-5" />
        </Link>
        <span className="flex size-8 items-center justify-center rounded-full bg-red">
          <Sparkles className="size-4 text-white" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold leading-tight">Booking assistant</p>
          <p className="text-xs text-muted">AI · K confirms every booking</p>
        </div>
        <Link href="/book" className="text-sm text-muted hover:text-fg">
          Book manually
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="grid gap-3">
          {bubbles.map((b, i) => (
            <div key={i} className={b.role === "user" ? "justify-self-end" : "justify-self-start"}>
              <p
                className={`max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed ${
                  b.role === "user"
                    ? "ml-auto rounded-br-md bg-red text-white"
                    : b.error
                      ? "rounded-bl-md border border-red/40 bg-red/10"
                      : "rounded-bl-md bg-surface-2"
                }`}
              >
                {b.text}
              </p>
              {b.drafts?.map((d) => <DraftCard key={d.start + d.serviceId} draft={d} />)}
            </div>
          ))}
          {busy && (
            <div className="flex gap-1 justify-self-start rounded-3xl rounded-bl-md bg-surface-2 px-4 py-3.5">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="size-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {bubbles.length === 1 && (
          <div className="no-scrollbar -mx-3 mb-3 flex gap-2 overflow-x-auto px-3">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-sm hover:border-muted"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Fade and beard on Saturday morning"
            maxLength={1000}
            aria-label="Message"
            className="min-w-0 flex-1 rounded-full border border-line bg-surface px-5 py-3 text-[16px] outline-none focus:border-red"
          />
          <button
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-red text-white disabled:opacity-40"
          >
            <ArrowUp className="size-5" />
          </button>
        </form>
      </div>
    </main>
  );
}

function DraftCard({ draft }: { draft: BookingDraft }) {
  const q = new URLSearchParams({
    service: draft.serviceId,
    mode: draft.mode,
    start: draft.start,
    source: "chat",
    ...(draft.postcode ? { postcode: draft.postcode } : {}),
  });
  return (
    <div className="mt-2 w-72 max-w-full rounded-2xl border border-red/60 bg-surface p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red">
        <CalendarCheck className="size-4" /> Ready to book
      </p>
      <p className="mt-2 font-semibold">{draft.serviceName}</p>
      <p className="text-sm text-muted">
        {formatInTimeZone(new Date(draft.start), TIMEZONE, "EEE d MMM, HH:mm")} ·{" "}
        {draft.mode === "travel" ? `Home visit ${draft.postcode}` : "At K's"} · {formatPrice(draft.totalPence)}
      </p>
      <Link
        href={`/book?${q}`}
        className="mt-3 block rounded-full bg-red py-2.5 text-center text-sm font-semibold text-white"
      >
        Review &amp; send
      </Link>
    </div>
  );
}
